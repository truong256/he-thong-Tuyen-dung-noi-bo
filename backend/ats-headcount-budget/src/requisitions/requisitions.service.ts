import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../common/auth.types';
import { Role, BUDGET_FULL_READERS } from '../common/roles.enum';
import { Department } from '../departments/department.entity';
import { HeadcountBudgetService } from '../headcount-budget/headcount-budget.service';
import { ApproveDto } from '../headcount-budget/dto/budget.dto';
import { CreateRequisitionDto, ListRequisitionsQuery } from './dto/requisition.dto';
import {
  OVERDUE_ELIGIBLE_STATUSES,
  Requisition,
  RequisitionReason,
  RequisitionStatus,
} from './requisition.entity';

/**
 * Bản tối thiểu của vòng đời yêu cầu tuyển dụng — đủ để chứng minh S3-04:
 *   DRAFT -> PENDING_APPROVAL -> APPROVED (kiểm ngân sách ở bước này) -> CANCELLED/FILLED
 * Luồng duyệt nhiều cấp đầy đủ thuộc S3-01/S3-02.
 */
@Injectable()
export class RequisitionsService {
  constructor(
    @InjectRepository(Requisition) private readonly repo: Repository<Requisition>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    private readonly budgets: HeadcountBudgetService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRequisitionDto, user: AuthUser) {
    this.assertDepartmentScope(user, dto.departmentId);
    const dept = await this.departments.findOne({ where: { id: dto.departmentId } });
    if (!dept) {
      throw new NotFoundException({ code: 'DEPARTMENT_NOT_FOUND', message: 'Không tìm thấy phòng ban.' });
    }
    if (!dept.active) {
      throw new UnprocessableEntityException({
        code: 'DEPARTMENT_INACTIVE',
        message: 'Phòng ban đã ngừng áp dụng.',
      });
    }
    const saved = await this.repo.save(
      this.repo.create({
        title: dto.title,
        departmentId: dto.departmentId,
        budgetYear: dto.budgetYear ?? new Date().getFullYear(),
        quantity: dto.quantity,
        proposedSalaryVnd: dto.proposedSalaryVnd,
        reason: dto.reason ?? RequisitionReason.NEW,
        dueDate: dto.dueDate ?? null,
        status: RequisitionStatus.DRAFT,
        createdBy: user.id,
      }),
    );
    return this.toView(saved, user);
  }

  async findOne(id: number, user: AuthUser) {
    const r = await this.load(id);
    this.assertDepartmentScope(user, r.departmentId);
    return this.toView(r, user);
  }

  /** S3-08: lọc theo trạng thái / phòng ban / từ khoá / khoảng hạn tuyển / chỉ trễ hạn. */
  async list(user: AuthUser, filter: ListRequisitionsQuery = {}) {
    const qb = this.repo.createQueryBuilder('r').orderBy('r.id', 'DESC');
    if (this.isScopedToDepartment(user)) qb.andWhere('r.departmentId = :scoped', { scoped: user.departmentId ?? -1 });
    else if (filter.departmentId) qb.andWhere('r.departmentId = :dep', { dep: filter.departmentId });
    if (filter.status) qb.andWhere('r.status = :st', { st: filter.status });
    if (filter.q?.trim()) {
      qb.andWhere('LOWER(r.title) LIKE :q', { q: `%${filter.q.trim().toLowerCase().replace(/[%_]/g, '')}%` });
    }
    if (filter.dueFrom) qb.andWhere('r.dueDate >= :df', { df: filter.dueFrom });
    if (filter.dueTo) qb.andWhere('r.dueDate <= :dt', { dt: filter.dueTo });
    if (filter.overdue) {
      qb.andWhere('r.dueDate IS NOT NULL AND r.dueDate < :today', { today: this.today() });
      qb.andWhere('r.status IN (:...open)', { open: OVERDUE_ELIGIBLE_STATUSES });
    }
    const rows = await qb.getMany();
    return rows.map((r) => ({ ...r, ...this.overdueInfo(r) }));
  }

  async submit(id: number, user: AuthUser) {
    const r = await this.load(id);
    this.assertDepartmentScope(user, r.departmentId);
    this.assertStatus(r, [RequisitionStatus.DRAFT], 'gửi duyệt');
    r.status = RequisitionStatus.PENDING_APPROVAL;
    return this.toView(await this.repo.save(r), user);
  }

  /** Duyệt yêu cầu: kiểm ngân sách + (tuỳ chọn) ghi đè — tất cả trong 1 transaction. */
  async approve(id: number, dto: ApproveDto, user: AuthUser) {
    const approved = await this.dataSource.transaction(async (m) => {
      const r = await m.findOne(Requisition, { where: { id } });
      if (!r) throw this.notFound();
      this.assertStatus(r, [RequisitionStatus.PENDING_APPROVAL], 'duyệt');

      const { overridden } = await this.budgets.enforceOnApproval(m, user, r, dto.override);

      r.status = RequisitionStatus.APPROVED;
      r.approvedBy = user.id;
      r.approvedAt = new Date();
      r.budgetOverridden = overridden;
      return m.save(r);
    });
    return this.toView(approved, user);
  }

  /** S3-07 — Tạm dừng: yêu cầu đã duyệt -> ON_HOLD (không còn chiếm headcount). */
  async hold(id: number, user: AuthUser, reason: string) {
    return this.changeStatus(id, user, [RequisitionStatus.APPROVED], RequisitionStatus.ON_HOLD, 'tạm dừng', reason);
  }

  /** S3-07 — Đóng: yêu cầu đã duyệt hoặc đang tạm dừng -> CLOSED. */
  async close(id: number, user: AuthUser, reason: string) {
    return this.changeStatus(
      id,
      user,
      [RequisitionStatus.APPROVED, RequisitionStatus.ON_HOLD],
      RequisitionStatus.CLOSED,
      'đóng',
      reason,
    );
  }

  /** Huỷ yêu cầu => không còn hiệu lực => headcount được trả lại ngân sách. */
  async cancel(id: number, user: AuthUser, reason: string) {
    return this.changeStatus(
      id,
      user,
      [
        RequisitionStatus.DRAFT,
        RequisitionStatus.PENDING_APPROVAL,
        RequisitionStatus.APPROVED,
        RequisitionStatus.ON_HOLD,
      ],
      RequisitionStatus.CANCELLED,
      'huỷ',
      reason,
    );
  }

  /** S3-07 — Tiếp tục: ON_HOLD -> APPROVED, kiểm lại ngân sách (headcount đã được trả lại khi tạm dừng). */
  async resume(id: number, dto: ApproveDto, user: AuthUser) {
    const resumed = await this.dataSource.transaction(async (m) => {
      const r = await m.findOne(Requisition, { where: { id } });
      if (!r) throw this.notFound();
      this.assertDepartmentScope(user, r.departmentId);
      this.assertStatus(r, [RequisitionStatus.ON_HOLD], 'tiếp tục');
      const { overridden } = await this.budgets.enforceOnApproval(m, user, r, dto.override);
      r.status = RequisitionStatus.APPROVED;
      r.budgetOverridden = r.budgetOverridden || overridden;
      r.statusReason = null;
      r.statusChangedBy = user.id;
      r.statusChangedAt = new Date();
      return m.save(r);
    });
    return this.toView(resumed, user);
  }

  private async changeStatus(
    id: number,
    user: AuthUser,
    from: RequisitionStatus[],
    to: RequisitionStatus,
    action: string,
    reason: string,
  ) {
    const r = await this.load(id);
    this.assertDepartmentScope(user, r.departmentId);
    this.assertStatus(r, from, action);
    const text = (reason ?? '').trim();
    if (text.length < 5) {
      throw new BadRequestException({ code: 'REASON_REQUIRED', message: `Phải nhập lý do ${action} (tối thiểu 5 ký tự).` });
    }
    r.status = to;
    r.statusReason = text.slice(0, 500);
    r.statusChangedBy = user.id;
    r.statusChangedAt = new Date();
    return this.toView(await this.repo.save(r), user);
  }

  // ------------------------------------------------------------------

  /** Mỗi yêu cầu trả kèm số headcount còn lại của phòng ban (AC #2). */
  private async toView(r: Requisition, user: AuthUser) {
    const evaluation = await this.budgets.evaluate({
      departmentId: r.departmentId,
      year: r.budgetYear,
      quantity: r.quantity,
      proposedSalaryVnd: r.proposedSalaryVnd,
      excludeRequisitionId: r.id,
    });
    const canSeeSalary = user.roles.some((x) => BUDGET_FULL_READERS.includes(x));
    return {
      ...r,
      ...this.overdueInfo(r),
      budget: canSeeSalary ? evaluation : this.budgets.redactSalary(evaluation),
      canOverride: user.roles.includes(Role.HR_MANAGER),
    };
  }

  private today(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** S3-08: trễ hạn = có hạn tuyển đã qua + yêu cầu còn đang xử lý/tuyển. */
  private overdueInfo(r: Pick<Requisition, 'dueDate' | 'status'>) {
    if (!r.dueDate || !OVERDUE_ELIGIBLE_STATUSES.includes(r.status) || r.dueDate >= this.today()) {
      return { isOverdue: false, daysOverdue: 0 };
    }
    const ms = Date.parse(this.today() + 'T00:00:00Z') - Date.parse(String(r.dueDate).slice(0, 10) + 'T00:00:00Z');
    return { isOverdue: true, daysOverdue: Math.max(1, Math.round(ms / 86_400_000)) };
  }

  private async load(id: number) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw this.notFound();
    return r;
  }

  private assertStatus(r: Requisition, allowed: RequisitionStatus[], action: string) {
    if (!allowed.includes(r.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS',
        message: `Không thể ${action} yêu cầu đang ở trạng thái ${r.status}.`,
      });
    }
  }

  private isScopedToDepartment(user: AuthUser): boolean {
    return !user.roles.some((r) => [Role.HR_MANAGER, Role.ADMIN, Role.APPROVER, Role.RECRUITER].includes(r));
  }

  private assertDepartmentScope(user: AuthUser, departmentId: number) {
    if (this.isScopedToDepartment(user) && user.departmentId !== departmentId) {
      throw new ForbiddenException({
        code: 'DEPARTMENT_SCOPE',
        message: 'Bạn chỉ được thao tác trên yêu cầu của phòng ban mình.',
      });
    }
  }

  private notFound() {
    return new NotFoundException({ code: 'REQUISITION_NOT_FOUND', message: 'Không tìm thấy yêu cầu tuyển dụng.' });
  }
}

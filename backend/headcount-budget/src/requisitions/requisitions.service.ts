import {
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
import { CreateRequisitionDto } from './dto/requisition.dto';
import { Requisition, RequisitionReason, RequisitionStatus } from './requisition.entity';

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

  async list(user: AuthUser, filter: { departmentId?: number; status?: RequisitionStatus }) {
    const where: Record<string, unknown> = {};
    if (this.isScopedToDepartment(user)) where.departmentId = user.departmentId ?? -1;
    else if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.status) where.status = filter.status;
    const rows = await this.repo.find({ where, order: { id: 'DESC' } });
    return rows;
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

  /** Huỷ yêu cầu => không còn hiệu lực => headcount được trả lại ngân sách. */
  async cancel(id: number, user: AuthUser) {
    const r = await this.load(id);
    this.assertDepartmentScope(user, r.departmentId);
    this.assertStatus(
      r,
      [
        RequisitionStatus.DRAFT,
        RequisitionStatus.PENDING_APPROVAL,
        RequisitionStatus.APPROVED,
        RequisitionStatus.ON_HOLD,
      ],
      'huỷ',
    );
    r.status = RequisitionStatus.CANCELLED;
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
      budget: canSeeSalary ? evaluation : this.budgets.redactSalary(evaluation),
      canOverride: user.roles.includes(Role.HR_MANAGER),
    };
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

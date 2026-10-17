import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { Department } from '../departments/department.entity';
import { AuthUser } from '../common/auth.types';
import { Role } from '../common/roles.enum';
import { Requisition, BUDGET_COUNTED_STATUSES } from '../requisitions/requisition.entity';
import { BudgetAuditAction, BudgetAuditLog } from './budget-audit-log.entity';
import { HeadcountBudget } from './headcount-budget.entity';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

/** Lương đề xuất là VND/tháng/người -> quy đổi chi phí lương cả năm của yêu cầu. */
export const ANNUALIZATION_MONTHS = 12;
export const MIN_OVERRIDE_REASON_LENGTH = 10;

export interface BudgetUsage {
  headcountUsed: number;
  salaryUsedVnd: number;
}

export interface BudgetSummary {
  departmentId: number;
  year: number;
  hasBudget: boolean;
  headcountQuota: number;
  headcountUsed: number;
  headcountRemaining: number;
  salaryBudgetVnd: number;
  salaryUsedVnd: number;
  salaryRemainingVnd: number;
}

export interface BudgetEvaluation extends BudgetSummary {
  requestedQuantity: number;
  requestedSalaryCostVnd: number;
  exceedsHeadcount: boolean;
  headcountOver: number;
  exceedsSalary: boolean;
  salaryOverVnd: number;
  exceeds: boolean;
}

export interface EvaluateInput {
  departmentId: number;
  year: number;
  quantity: number;
  proposedSalaryVnd: number;
  excludeRequisitionId?: number;
}

@Injectable()
export class HeadcountBudgetService {
  constructor(
    @InjectRepository(HeadcountBudget) private readonly budgets: Repository<HeadcountBudget>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(BudgetAuditLog) private readonly logs: Repository<BudgetAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ------------------------------------------------------------------
  // SCRUM-124 — CRUD ngân sách
  // ------------------------------------------------------------------
  async create(dto: CreateBudgetDto, user: AuthUser) {
    const dept = await this.departments.findOne({ where: { id: dto.departmentId } });
    if (!dept) {
      throw new NotFoundException({ code: 'DEPARTMENT_NOT_FOUND', message: 'Không tìm thấy phòng ban.' });
    }
    if (!dept.active) {
      throw new UnprocessableEntityException({
        code: 'DEPARTMENT_INACTIVE',
        message: 'Phòng ban đã ngừng áp dụng, không thể khai báo ngân sách.',
      });
    }

    return this.dataSource.transaction(async (m) => {
      const exists = await m.findOne(HeadcountBudget, {
        where: { departmentId: dto.departmentId, year: dto.year },
      });
      if (exists) {
        throw new ConflictException({
          code: 'BUDGET_ALREADY_EXISTS',
          message: `Phòng ban "${dept.name}" đã có ngân sách năm ${dto.year}. Hãy cập nhật thay vì tạo mới.`,
        });
      }
      let saved: HeadcountBudget;
      try {
        saved = await m.save(
          m.create(HeadcountBudget, {
            departmentId: dto.departmentId,
            year: dto.year,
            headcountQuota: dto.headcountQuota,
            salaryBudgetVnd: dto.salaryBudgetVnd,
            createdBy: user.id,
            updatedBy: user.id,
          }),
        );
      } catch (e) {
        // Hai request tạo đồng thời: ràng buộc UNIQUE (department_id, year) là chốt chặn cuối.
        if (e instanceof QueryFailedError && /unique/i.test(e.message)) {
          throw new ConflictException({
            code: 'BUDGET_ALREADY_EXISTS',
            message: `Phòng ban "${dept.name}" đã có ngân sách năm ${dto.year}.`,
          });
        }
        throw e;
      }
      await this.writeLog(m, BudgetAuditAction.BUDGET_CREATED, user, {
        departmentId: saved.departmentId,
        year: saved.year,
        detail: { after: this.snapshot(saved) },
      });
      return this.toView(await this.summarize(saved.departmentId, saved.year, m), saved);
    });
  }

  async update(id: number, dto: UpdateBudgetDto, user: AuthUser) {
    return this.dataSource.transaction(async (m) => {
      const budget = await m.findOne(HeadcountBudget, { where: { id } });
      if (!budget) throw this.notFound();

      const usage = await this.getUsage(budget.departmentId, budget.year, m);
      if (dto.headcountQuota < usage.headcountUsed) {
        throw new UnprocessableEntityException({
          code: 'QUOTA_BELOW_USED',
          message: `Chỉ tiêu mới (${dto.headcountQuota}) thấp hơn số headcount đã dùng (${usage.headcountUsed}).`,
          details: { headcountUsed: usage.headcountUsed },
        });
      }
      if (dto.salaryBudgetVnd < usage.salaryUsedVnd) {
        throw new UnprocessableEntityException({
          code: 'SALARY_BUDGET_BELOW_USED',
          message: `Ngân sách lương mới thấp hơn số đã dùng (${usage.salaryUsedVnd} VND).`,
          details: { salaryUsedVnd: usage.salaryUsedVnd },
        });
      }

      const before = this.snapshot(budget);
      budget.headcountQuota = dto.headcountQuota;
      budget.salaryBudgetVnd = dto.salaryBudgetVnd;
      budget.updatedBy = user.id;
      const saved = await m.save(budget);
      await this.writeLog(m, BudgetAuditAction.BUDGET_UPDATED, user, {
        departmentId: saved.departmentId,
        year: saved.year,
        detail: { before, after: this.snapshot(saved) },
      });
      return this.toView(await this.summarize(saved.departmentId, saved.year, m), saved);
    });
  }

  async remove(id: number, user: AuthUser) {
    return this.dataSource.transaction(async (m) => {
      const budget = await m.findOne(HeadcountBudget, { where: { id } });
      if (!budget) throw this.notFound();
      const usage = await this.getUsage(budget.departmentId, budget.year, m);
      if (usage.headcountUsed > 0) {
        throw new ConflictException({
          code: 'BUDGET_IN_USE',
          message: 'Không thể xoá ngân sách đã có yêu cầu tuyển dụng được duyệt.',
        });
      }
      await m.remove(budget);
      await this.writeLog(m, BudgetAuditAction.BUDGET_DELETED, user, {
        departmentId: budget.departmentId,
        year: budget.year,
        detail: { before: this.snapshot({ ...budget, id }) },
      });
      return { deleted: true };
    });
  }

  async findOne(id: number) {
    const budget = await this.budgets.findOne({ where: { id } });
    if (!budget) throw this.notFound();
    return this.toView(await this.summarize(budget.departmentId, budget.year), budget);
  }

  async list(filter: { year?: number; departmentId?: number }) {
    const where: Record<string, number> = {};
    if (filter.year) where.year = filter.year;
    if (filter.departmentId) where.departmentId = filter.departmentId;
    const rows = await this.budgets.find({ where, order: { year: 'DESC', departmentId: 'ASC' } });
    const result: unknown[] = [];
    for (const b of rows) {
      result.push(this.toView(await this.summarize(b.departmentId, b.year), b));
    }
    return result;
  }

  // ------------------------------------------------------------------
  // SCRUM-125 — Tính headcount còn lại
  // ------------------------------------------------------------------

  /** Tổng headcount & lương đã dùng = các yêu cầu ĐÃ DUYỆT và CÒN HIỆU LỰC (APPROVED, FILLED). */
  async getUsage(
    departmentId: number,
    year: number,
    manager: EntityManager = this.dataSource.manager,
    excludeRequisitionId?: number,
  ): Promise<BudgetUsage> {
    const qb = manager
      .createQueryBuilder(Requisition, 'r')
      .select('COALESCE(SUM(r.quantity), 0)', 'headcount')
      .addSelect(`COALESCE(SUM(r.quantity * r.proposedSalaryVnd * ${ANNUALIZATION_MONTHS}), 0)`, 'salary')
      .where('r.departmentId = :departmentId', { departmentId })
      .andWhere('r.budgetYear = :year', { year })
      .andWhere('r.status IN (:...statuses)', { statuses: BUDGET_COUNTED_STATUSES });
    if (excludeRequisitionId) qb.andWhere('r.id != :excludeId', { excludeId: excludeRequisitionId });
    const raw = await qb.getRawOne<{ headcount: string | number; salary: string | number }>();
    return { headcountUsed: Number(raw?.headcount ?? 0), salaryUsedVnd: Number(raw?.salary ?? 0) };
  }

  /** Tóm tắt ngân sách của phòng ban/năm. Chưa khai báo ngân sách => chỉ tiêu 0. */
  async summarize(
    departmentId: number,
    year: number,
    manager: EntityManager = this.dataSource.manager,
    excludeRequisitionId?: number,
  ): Promise<BudgetSummary> {
    const budget = await manager.findOne(HeadcountBudget, { where: { departmentId, year } });
    const usage = await this.getUsage(departmentId, year, manager, excludeRequisitionId);
    const quota = budget?.headcountQuota ?? 0;
    const salaryBudget = budget?.salaryBudgetVnd ?? 0;
    return {
      departmentId,
      year,
      hasBudget: !!budget,
      headcountQuota: quota,
      headcountUsed: usage.headcountUsed,
      headcountRemaining: quota - usage.headcountUsed,
      salaryBudgetVnd: salaryBudget,
      salaryUsedVnd: usage.salaryUsedVnd,
      salaryRemainingVnd: salaryBudget - usage.salaryUsedVnd,
    };
  }

  /** Đánh giá một yêu cầu (số lượng + lương) có vượt ngân sách hay không. */
  async evaluate(input: EvaluateInput, manager?: EntityManager): Promise<BudgetEvaluation> {
    const s = await this.summarize(input.departmentId, input.year, manager, input.excludeRequisitionId);
    const requestedSalaryCostVnd = input.quantity * input.proposedSalaryVnd * ANNUALIZATION_MONTHS;
    const headcountOver = Math.max(0, input.quantity - s.headcountRemaining);
    const salaryOverVnd = Math.max(0, requestedSalaryCostVnd - s.salaryRemainingVnd);
    return {
      ...s,
      requestedQuantity: input.quantity,
      requestedSalaryCostVnd,
      exceedsHeadcount: headcountOver > 0,
      headcountOver,
      exceedsSalary: salaryOverVnd > 0,
      salaryOverVnd,
      exceeds: headcountOver > 0 || salaryOverVnd > 0,
    };
  }

  async check(dto: { departmentId: number; year: number; quantity: number; proposedSalaryVnd: number }) {
    return this.evaluate(dto);
  }

  /**
   * Chốt chặn khi DUYỆT yêu cầu: trong cùng transaction với việc đổi trạng thái.
   *  - Trong ngân sách              -> cho qua.
   *  - Vượt + không ghi đè          -> 409 (chặn).
   *  - Vượt + ghi đè bởi non-HR     -> 403.
   *  - Vượt + ghi đè thiếu lý do    -> 400.
   *  - Vượt + HR Manager + có lý do -> cho qua và GHI NHẬT KÝ.
   */
  async enforceOnApproval(
    manager: EntityManager,
    user: AuthUser,
    requisition: Pick<Requisition, 'id' | 'departmentId' | 'budgetYear' | 'quantity' | 'proposedSalaryVnd'>,
    override?: { reason: string },
  ): Promise<{ overridden: boolean; evaluation: BudgetEvaluation }> {
    // PostgreSQL: khoá dòng ngân sách để hai lần duyệt đồng thời không cùng "lọt" qua chỉ tiêu.
    if (manager.connection.options.type === 'postgres') {
      await manager.findOne(HeadcountBudget, {
        where: { departmentId: requisition.departmentId, year: requisition.budgetYear },
        lock: { mode: 'pessimistic_write' },
      });
    }

    const evaluation = await this.evaluate(
      {
        departmentId: requisition.departmentId,
        year: requisition.budgetYear,
        quantity: requisition.quantity,
        proposedSalaryVnd: requisition.proposedSalaryVnd,
        excludeRequisitionId: requisition.id,
      },
      manager,
    );
    if (!evaluation.exceeds) return { overridden: false, evaluation };

    const canOverride = user.roles.includes(Role.HR_MANAGER);

    if (!override) {
      throw new ConflictException({
        code: evaluation.hasBudget ? 'HEADCOUNT_BUDGET_EXCEEDED' : 'BUDGET_NOT_DEFINED',
        message: this.exceedMessage(evaluation),
        canOverride,
        details: evaluation,
      });
    }
    if (!canOverride) {
      throw new ForbiddenException({
        code: 'OVERRIDE_FORBIDDEN',
        message: 'Chỉ Trưởng phòng Nhân sự (HR Manager) được ghi đè khi vượt chỉ tiêu headcount.',
      });
    }
    const reason = (override.reason ?? '').trim();
    if (reason.length < MIN_OVERRIDE_REASON_LENGTH) {
      throw new BadRequestException({
        code: 'OVERRIDE_REASON_REQUIRED',
        message: `Phải nhập lý do ghi đè (tối thiểu ${MIN_OVERRIDE_REASON_LENGTH} ký tự).`,
      });
    }

    await this.writeLog(manager, BudgetAuditAction.BUDGET_OVERRIDE, user, {
      departmentId: requisition.departmentId,
      year: requisition.budgetYear,
      requisitionId: requisition.id,
      reason,
      detail: evaluation,
    });
    return { overridden: true, evaluation };
  }

  // ------------------------------------------------------------------
  // Nhật ký
  // ------------------------------------------------------------------
  async listLogs(filter: { departmentId?: number; year?: number; action?: BudgetAuditAction }) {
    const where: Record<string, unknown> = {};
    if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.year) where.year = filter.year;
    if (filter.action) where.action = filter.action;
    const rows = await this.logs.find({ where, order: { id: 'DESC' }, take: 200 });
    return rows.map((r) => ({ ...r, detail: r.detail ? JSON.parse(r.detail) : null }));
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  /** Chỉ HR/Admin/Approver thấy ngân sách lương; vai trò khác chỉ thấy headcount. */
  redactSalary<T extends BudgetSummary>(s: T): Omit<T, 'salaryBudgetVnd' | 'salaryUsedVnd' | 'salaryRemainingVnd'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { salaryBudgetVnd, salaryUsedVnd, salaryRemainingVnd, ...rest } = s;
    return rest;
  }

  private toView(summary: BudgetSummary, b: HeadcountBudget) {
    return {
      id: b.id,
      ...summary,
      version: b.version,
      createdBy: b.createdBy,
      updatedBy: b.updatedBy,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  private snapshot(b: Pick<HeadcountBudget, 'id' | 'departmentId' | 'year' | 'headcountQuota' | 'salaryBudgetVnd'>) {
    return {
      id: b.id,
      departmentId: b.departmentId,
      year: b.year,
      headcountQuota: b.headcountQuota,
      salaryBudgetVnd: b.salaryBudgetVnd,
    };
  }

  private exceedMessage(e: BudgetEvaluation): string {
    if (!e.hasBudget) {
      return `Phòng ban chưa có ngân sách headcount năm ${e.year}. Cần HR Manager khai báo hoặc ghi đè kèm lý do.`;
    }
    const parts: string[] = [];
    if (e.exceedsHeadcount) {
      parts.push(`headcount còn lại ${Math.max(0, e.headcountRemaining)}, yêu cầu ${e.requestedQuantity} (vượt ${e.headcountOver})`);
    }
    if (e.exceedsSalary) {
      parts.push(`ngân sách lương còn lại ${Math.max(0, e.salaryRemainingVnd)} VND, yêu cầu ${e.requestedSalaryCostVnd} VND (vượt ${e.salaryOverVnd} VND)`);
    }
    return `Vượt chỉ tiêu: ${parts.join('; ')}. Cần HR Manager xác nhận ghi đè kèm lý do.`;
  }

  private async writeLog(
    m: EntityManager,
    action: BudgetAuditAction,
    user: AuthUser,
    p: {
      departmentId: number;
      year: number;
      requisitionId?: number;
      reason?: string;
      detail?: unknown;
    },
  ) {
    await m.insert(BudgetAuditLog, {
      action,
      departmentId: p.departmentId,
      year: p.year,
      requisitionId: p.requisitionId ?? null,
      userId: user.id,
      userEmail: user.email,
      reason: p.reason ?? null,
      detail: p.detail === undefined ? null : JSON.stringify(p.detail),
    });
  }

  private notFound() {
    return new NotFoundException({ code: 'BUDGET_NOT_FOUND', message: 'Không tìm thấy ngân sách headcount.' });
  }
}

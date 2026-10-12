import { TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createServiceTestingModule, Fixture, insertRequisition, seedFixture } from '../../test/helpers/test-app';
import { RequisitionStatus } from '../requisitions/requisition.entity';
import { BudgetAuditAction, BudgetAuditLog } from './budget-audit-log.entity';
import { HeadcountBudgetService } from './headcount-budget.service';

const YEAR = 2026;

describe('HeadcountBudgetService (SCRUM-124 / SCRUM-125)', () => {
  let mod: TestingModule;
  let svc: HeadcountBudgetService;
  let ds: DataSource;
  let f: Fixture;

  beforeEach(async () => {
    mod = await createServiceTestingModule();
    svc = mod.get(HeadcountBudgetService);
    ds = mod.get(DataSource);
    f = await seedFixture(mod);
  });
  afterEach(async () => {
    await mod.close();
  });

  const createBudget = (departmentId = f.deptIt.id, quota = 5, salary = 1_200_000_000) =>
    svc.create({ departmentId, year: YEAR, headcountQuota: quota, salaryBudgetVnd: salary }, f.hr);

  const logs = () => ds.getRepository(BudgetAuditLog).find({ order: { id: 'ASC' } });

  // ------------------------------------------------------------ CRUD
  describe('CRUD ngân sách', () => {
    it('khai báo chỉ tiêu + ngân sách lương theo phòng ban/năm và ghi nhật ký', async () => {
      const b = await createBudget();
      expect(b).toMatchObject({
        departmentId: f.deptIt.id,
        year: YEAR,
        headcountQuota: 5,
        salaryBudgetVnd: 1_200_000_000,
        headcountUsed: 0,
        headcountRemaining: 5,
        salaryRemainingVnd: 1_200_000_000,
        hasBudget: true,
      });
      const l = await logs();
      expect(l).toHaveLength(1);
      expect(l[0].action).toBe(BudgetAuditAction.BUDGET_CREATED);
      expect(l[0].userEmail).toBe(f.hr.email);
    });

    it('chặn khai báo trùng phòng ban + năm', async () => {
      await createBudget();
      await expect(createBudget()).rejects.toMatchObject({ response: { code: 'BUDGET_ALREADY_EXISTS' } });
      await expect(createBudget()).rejects.toBeInstanceOf(ConflictException);
    });

    it('cho phép cùng phòng ban khác năm, cùng năm khác phòng ban', async () => {
      await createBudget();
      await svc.create({ departmentId: f.deptIt.id, year: YEAR + 1, headcountQuota: 2, salaryBudgetVnd: 1 }, f.hr);
      await createBudget(f.deptMkt.id);
      expect(await svc.list({})).toHaveLength(3);
    });

    it('từ chối phòng ban không tồn tại / đã ngừng áp dụng', async () => {
      await expect(createBudget(9999)).rejects.toBeInstanceOf(NotFoundException);
      await expect(createBudget(f.deptOld.id)).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('cập nhật chỉ tiêu và ghi nhật ký trước/sau', async () => {
      const b = await createBudget();
      const u = await svc.update(b.id, { headcountQuota: 8, salaryBudgetVnd: 2_000_000_000 }, f.hr);
      expect(u.headcountQuota).toBe(8);
      expect(u.headcountRemaining).toBe(8);
      const l = await logs();
      expect(l[1].action).toBe(BudgetAuditAction.BUDGET_UPDATED);
      const detail = JSON.parse(l[1].detail as string);
      expect(detail.before.headcountQuota).toBe(5);
      expect(detail.after.headcountQuota).toBe(8);
    });

    it('không cho hạ chỉ tiêu thấp hơn số đã dùng', async () => {
      const b = await createBudget(f.deptIt.id, 5);
      await insertRequisition(mod, { departmentId: f.deptIt.id, quantity: 3, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      await expect(svc.update(b.id, { headcountQuota: 2, salaryBudgetVnd: 1_200_000_000 }, f.hr)).rejects.toMatchObject({
        response: { code: 'QUOTA_BELOW_USED' },
      });
    });

    it('không cho hạ ngân sách lương thấp hơn số đã dùng', async () => {
      const b = await createBudget(f.deptIt.id, 5, 1_000_000_000);
      // 2 người x 20tr x 12 = 480tr
      await insertRequisition(mod, { departmentId: f.deptIt.id, quantity: 2, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      await expect(svc.update(b.id, { headcountQuota: 5, salaryBudgetVnd: 400_000_000 }, f.hr)).rejects.toMatchObject({
        response: { code: 'SALARY_BUDGET_BELOW_USED' },
      });
    });

    it('update/xoá/đọc ngân sách không tồn tại => 404', async () => {
      await expect(svc.update(999, { headcountQuota: 1, salaryBudgetVnd: 1 }, f.hr)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.remove(999, f.hr)).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('xoá được khi chưa dùng, không xoá được khi đã có yêu cầu duyệt', async () => {
      const b1 = await createBudget(f.deptIt.id);
      const b2 = await createBudget(f.deptMkt.id);
      await insertRequisition(mod, { departmentId: f.deptMkt.id, quantity: 1, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      await expect(svc.remove(b2.id, f.hr)).rejects.toMatchObject({ response: { code: 'BUDGET_IN_USE' } });
      await expect(svc.remove(b1.id, f.hr)).resolves.toEqual({ deleted: true });
      expect((await logs()).some((l) => l.action === BudgetAuditAction.BUDGET_DELETED)).toBe(true);
    });

    it('list lọc theo năm và phòng ban', async () => {
      await createBudget(f.deptIt.id);
      await createBudget(f.deptMkt.id);
      await svc.create({ departmentId: f.deptIt.id, year: 2027, headcountQuota: 1, salaryBudgetVnd: 1 }, f.hr);
      expect(await svc.list({ year: 2026 })).toHaveLength(2);
      expect(await svc.list({ departmentId: f.deptIt.id })).toHaveLength(2);
      expect(await svc.list({ year: 2027, departmentId: f.deptIt.id })).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------ Tính còn lại
  describe('Tính headcount còn lại (SCRUM-125)', () => {
    it('chưa khai báo ngân sách => chỉ tiêu 0, hasBudget=false', async () => {
      const s = await svc.summarize(f.deptIt.id, YEAR);
      expect(s).toMatchObject({ hasBudget: false, headcountQuota: 0, headcountRemaining: 0 });
    });

    it('chỉ tính yêu cầu ĐÃ DUYỆT và CÒN HIỆU LỰC (APPROVED, FILLED)', async () => {
      await createBudget(f.deptIt.id, 20);
      const mk = (status: RequisitionStatus, quantity: number) =>
        insertRequisition(mod, { departmentId: f.deptIt.id, quantity, status, createdBy: f.hr.id });
      await mk(RequisitionStatus.APPROVED, 2);
      await mk(RequisitionStatus.FILLED, 3);
      // Các trạng thái KHÔNG được tính:
      await mk(RequisitionStatus.DRAFT, 10);
      await mk(RequisitionStatus.PENDING_APPROVAL, 10);
      await mk(RequisitionStatus.REJECTED, 10);
      await mk(RequisitionStatus.CANCELLED, 10);
      await mk(RequisitionStatus.ON_HOLD, 10);
      const s = await svc.summarize(f.deptIt.id, YEAR);
      expect(s.headcountUsed).toBe(5);
      expect(s.headcountRemaining).toBe(15);
    });

    it('không lẫn dữ liệu giữa phòng ban và năm khác', async () => {
      await createBudget(f.deptIt.id, 10);
      await insertRequisition(mod, { departmentId: f.deptMkt.id, quantity: 4, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      await insertRequisition(mod, { departmentId: f.deptIt.id, year: 2025, quantity: 4, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      expect((await svc.summarize(f.deptIt.id, YEAR)).headcountUsed).toBe(0);
    });

    it('ngân sách lương dùng = số lượng x lương/tháng x 12 (VND)', async () => {
      await createBudget(f.deptIt.id, 10, 1_000_000_000);
      await insertRequisition(mod, { departmentId: f.deptIt.id, quantity: 2, salary: 25_000_000, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      const s = await svc.summarize(f.deptIt.id, YEAR);
      expect(s.salaryUsedVnd).toBe(600_000_000);
      expect(s.salaryRemainingVnd).toBe(400_000_000);
    });

    it('evaluate: đúng bằng số còn lại thì KHÔNG vượt', async () => {
      await createBudget(f.deptIt.id, 5, 1_200_000_000);
      // 5 x 20tr x 12 = 1.2 tỷ = đúng bằng ngân sách
      const e = await svc.evaluate({ departmentId: f.deptIt.id, year: YEAR, quantity: 5, proposedSalaryVnd: 20_000_000 });
      expect(e.exceeds).toBe(false);
      expect(e.headcountOver).toBe(0);
      expect(e.salaryOverVnd).toBe(0);
    });

    it('evaluate: vượt headcount', async () => {
      await createBudget(f.deptIt.id, 2, 9_000_000_000);
      const e = await svc.check({ departmentId: f.deptIt.id, year: YEAR, quantity: 3, proposedSalaryVnd: 10_000_000 });
      expect(e).toMatchObject({ exceedsHeadcount: true, headcountOver: 1, exceedsSalary: false, exceeds: true });
    });

    it('evaluate: vượt ngân sách lương dù còn headcount', async () => {
      await createBudget(f.deptIt.id, 10, 100_000_000);
      const e = await svc.evaluate({ departmentId: f.deptIt.id, year: YEAR, quantity: 1, proposedSalaryVnd: 20_000_000 });
      expect(e.exceedsHeadcount).toBe(false);
      expect(e.exceedsSalary).toBe(true);
      expect(e.salaryOverVnd).toBe(140_000_000);
    });

    it('evaluate: loại trừ chính yêu cầu đang xét khỏi số đã dùng', async () => {
      await createBudget(f.deptIt.id, 3);
      const r = await insertRequisition(mod, { departmentId: f.deptIt.id, quantity: 3, status: RequisitionStatus.APPROVED, createdBy: f.hr.id });
      const withSelf = await svc.evaluate({ departmentId: f.deptIt.id, year: YEAR, quantity: 3, proposedSalaryVnd: 1 });
      const withoutSelf = await svc.evaluate({ departmentId: f.deptIt.id, year: YEAR, quantity: 3, proposedSalaryVnd: 1, excludeRequisitionId: r.id });
      expect(withSelf.exceeds).toBe(true);
      expect(withoutSelf.headcountUsed).toBe(0);
    });
  });

  // ------------------------------------------------------------ Chặn & ghi đè
  describe('enforceOnApproval — chặn vượt chỉ tiêu và ghi đè', () => {
    const req = (quantity: number, salary = 10_000_000) => ({
      id: 777,
      departmentId: 0,
      budgetYear: YEAR,
      quantity,
      proposedSalaryVnd: salary,
    });
    const run = (user = f.hr, quantity = 3, override?: { reason: string }, deptId?: number) =>
      ds.transaction((m) => svc.enforceOnApproval(m, user, { ...req(quantity), departmentId: deptId ?? f.deptIt.id }, override));

    beforeEach(async () => {
      await createBudget(f.deptIt.id, 2, 9_000_000_000);
    });

    it('trong chỉ tiêu: cho qua, không ghi nhật ký ghi đè', async () => {
      const r = await run(f.approver, 2);
      expect(r.overridden).toBe(false);
      expect((await logs()).filter((l) => l.action === BudgetAuditAction.BUDGET_OVERRIDE)).toHaveLength(0);
    });

    it('vượt chỉ tiêu, không ghi đè => 409 HEADCOUNT_BUDGET_EXCEEDED (kèm canOverride)', async () => {
      await expect(run(f.approver, 3)).rejects.toMatchObject({
        response: { code: 'HEADCOUNT_BUDGET_EXCEEDED', canOverride: false },
      });
      await expect(run(f.hr, 3)).rejects.toMatchObject({
        response: { code: 'HEADCOUNT_BUDGET_EXCEEDED', canOverride: true },
      });
      await expect(run(f.hr, 3)).rejects.toBeInstanceOf(ConflictException);
    });

    it('vượt do ngân sách lương: thông báo nêu rõ phần lương', async () => {
      await createBudget(f.deptMkt.id, 10, 50_000_000);
      await expect(run(f.hr, 1, undefined, f.deptMkt.id)).rejects.toMatchObject({
        response: { message: expect.stringContaining('ngân sách lương') },
      });
    });

    it('vượt mà chưa có ngân sách => BUDGET_NOT_DEFINED', async () => {
      await expect(run(f.hr, 1, undefined, f.deptOld.id)).rejects.toMatchObject({ response: { code: 'BUDGET_NOT_DEFINED' } });
    });

    it('người KHÔNG phải HR Manager cố ghi đè => 403', async () => {
      for (const u of [f.approver, f.admin, f.hmIt]) {
        await expect(run(u, 3, { reason: 'Cần gấp cho dự án mới' })).rejects.toBeInstanceOf(ForbiddenException);
      }
      expect(await logs().then((l) => l.filter((x) => x.action === BudgetAuditAction.BUDGET_OVERRIDE))).toHaveLength(0);
    });

    it('HR Manager ghi đè nhưng thiếu/ngắn lý do => 400', async () => {
      await expect(run(f.hr, 3, { reason: '' })).rejects.toMatchObject({ response: { code: 'OVERRIDE_REASON_REQUIRED' } });
      await expect(run(f.hr, 3, { reason: '   ngắn   ' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('HR Manager ghi đè kèm lý do => cho qua và GHI NHẬT KÝ đầy đủ', async () => {
      const r = await run(f.hr, 3, { reason: '  Ký thêm hợp đồng khách hàng X  ' });
      expect(r.overridden).toBe(true);
      const l = (await logs()).filter((x) => x.action === BudgetAuditAction.BUDGET_OVERRIDE);
      expect(l).toHaveLength(1);
      expect(l[0]).toMatchObject({
        userId: f.hr.id,
        userEmail: f.hr.email,
        departmentId: f.deptIt.id,
        year: YEAR,
        requisitionId: 777,
        reason: 'Ký thêm hợp đồng khách hàng X',
      });
      const d = JSON.parse(l[0].detail as string);
      expect(d.headcountQuota).toBe(2);
      expect(d.requestedQuantity).toBe(3);
      expect(d.headcountOver).toBe(1);
    });

    it('gửi override nhưng không vượt => bỏ qua, không ghi nhật ký', async () => {
      const r = await run(f.hr, 1, { reason: 'Không cần thiết phải ghi đè' });
      expect(r.overridden).toBe(false);
      expect(await logs().then((l) => l.filter((x) => x.action === BudgetAuditAction.BUDGET_OVERRIDE))).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------ Nhật ký & tiện ích
  describe('nhật ký và che số liệu lương', () => {
    it('nhật ký là chỉ-thêm: sửa hoặc xoá bản ghi đều bị chặn', async () => {
      await createBudget();
      const repo = ds.getRepository(BudgetAuditLog);
      const [row] = await repo.find();
      row.reason = 'sửa lén';
      await expect(repo.save(row)).rejects.toThrow('không được sửa hoặc xoá');
      await expect(repo.remove(row)).rejects.toThrow('không được sửa hoặc xoá');
    });

    it('listLogs lọc theo action/phòng ban/năm và parse detail', async () => {
      const b = await createBudget(f.deptIt.id);
      await svc.update(b.id, { headcountQuota: 6, salaryBudgetVnd: 1_300_000_000 }, f.hr);
      const all = await svc.listLogs({});
      expect(all).toHaveLength(2);
      expect(all[0].action).toBe(BudgetAuditAction.BUDGET_UPDATED); // mới nhất trước
      expect(await svc.listLogs({ action: BudgetAuditAction.BUDGET_CREATED })).toHaveLength(1);
      expect(await svc.listLogs({ departmentId: f.deptMkt.id })).toHaveLength(0);
      expect(await svc.listLogs({ year: YEAR, departmentId: f.deptIt.id })).toHaveLength(2);
    });

    it('redactSalary loại bỏ mọi số liệu lương', async () => {
      await createBudget();
      const s = svc.redactSalary(await svc.summarize(f.deptIt.id, YEAR));
      expect(s).not.toHaveProperty('salaryBudgetVnd');
      expect(s).not.toHaveProperty('salaryUsedVnd');
      expect(s).not.toHaveProperty('salaryRemainingVnd');
      expect(s).toHaveProperty('headcountRemaining', 5);
    });
  });
});

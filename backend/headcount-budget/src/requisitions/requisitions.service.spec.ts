import { TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createServiceTestingModule, Fixture, insertRequisition, seedFixture } from '../../test/helpers/test-app';
import { HeadcountBudgetService } from '../headcount-budget/headcount-budget.service';
import { RequisitionStatus } from './requisition.entity';
import { RequisitionsService } from './requisitions.service';

const YEAR = 2026;

describe('RequisitionsService + ngân sách headcount (S3-04)', () => {
  let mod: TestingModule;
  let svc: RequisitionsService;
  let budget: HeadcountBudgetService;
  let f: Fixture;

  beforeEach(async () => {
    mod = await createServiceTestingModule();
    svc = mod.get(RequisitionsService);
    budget = mod.get(HeadcountBudgetService);
    f = await seedFixture(mod);
    await budget.create({ departmentId: f.deptIt.id, year: YEAR, headcountQuota: 3, salaryBudgetVnd: 2_000_000_000 }, f.hr);
  });
  afterEach(async () => {
    await mod.close();
  });

  const draft = (quantity = 1, user = f.hmIt, departmentId = f.deptIt.id) =>
    svc.create({ title: 'Dev', departmentId, budgetYear: YEAR, quantity, proposedSalaryVnd: 20_000_000 }, user);
  const toPending = async (quantity = 1) => {
    const r = await draft(quantity);
    await svc.submit(r.id, f.hmIt);
    return r;
  };

  it('AC2: yêu cầu mới hiển thị số headcount còn lại của phòng ban', async () => {
    const r = await draft(1);
    expect(r.status).toBe(RequisitionStatus.DRAFT);
    expect(r.budget.headcountQuota).toBe(3);
    expect(r.budget.headcountRemaining).toBe(3);
    // Hiring Manager không được thấy số liệu lương
    expect(r.budget).not.toHaveProperty('salaryBudgetVnd');
    expect(r.canOverride).toBe(false);
  });

  it('HR Manager xem được cả ngân sách lương và canOverride=true', async () => {
    const r = await draft(1);
    const v = await svc.findOne(r.id, f.hr);
    expect(v.budget).toHaveProperty('salaryBudgetVnd', 2_000_000_000);
    expect(v.canOverride).toBe(true);
  });

  it('Hiring Manager chỉ tạo/xem yêu cầu của phòng ban mình', async () => {
    await expect(draft(1, f.hmMkt, f.deptIt.id)).rejects.toBeInstanceOf(ForbiddenException);
    const r = await draft(1);
    await expect(svc.findOne(r.id, f.hmMkt)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await svc.list(f.hmMkt, {})).toHaveLength(0);
    expect(await svc.list(f.hmIt, {})).toHaveLength(1);
    expect(await svc.list(f.hr, { departmentId: f.deptMkt.id })).toHaveLength(0);
    expect(await svc.list(f.hr, { status: RequisitionStatus.DRAFT })).toHaveLength(1);
  });

  it('không tạo yêu cầu cho phòng ban không tồn tại / đã ngừng áp dụng', async () => {
    await expect(draft(1, f.hr, 9999)).rejects.toBeInstanceOf(NotFoundException);
    await expect(draft(1, f.hr, f.deptOld.id)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('năm ngân sách mặc định là năm hiện tại', async () => {
    const r = await svc.create({ title: 'x', departmentId: f.deptIt.id, quantity: 1, proposedSalaryVnd: 1 }, f.hr);
    expect(r.budgetYear).toBe(new Date().getFullYear());
  });

  it('duyệt trong chỉ tiêu: APPROVED, trừ vào headcount còn lại', async () => {
    const r = await toPending(2);
    const a = await svc.approve(r.id, {}, f.approver);
    expect(a.status).toBe(RequisitionStatus.APPROVED);
    expect(a.budgetOverridden).toBe(false);
    expect(a.approvedBy).toBe(f.approver.id);
    expect((await budget.summarize(f.deptIt.id, YEAR)).headcountRemaining).toBe(1);
  });

  it('AC3: vượt chỉ tiêu bị CHẶN, yêu cầu vẫn ở PENDING_APPROVAL', async () => {
    const r = await toPending(4);
    await expect(svc.approve(r.id, {}, f.approver)).rejects.toMatchObject({ response: { code: 'HEADCOUNT_BUDGET_EXCEEDED' } });
    await expect(svc.approve(r.id, {}, f.hr)).rejects.toBeInstanceOf(ConflictException);
    expect((await svc.findOne(r.id, f.hr)).status).toBe(RequisitionStatus.PENDING_APPROVAL);
  });

  it('AC3: approver cố ghi đè => 403, yêu cầu không được duyệt', async () => {
    const r = await toPending(4);
    await expect(svc.approve(r.id, { override: { reason: 'Cần gấp cho dự án mới' } }, f.approver)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect((await svc.findOne(r.id, f.hr)).status).toBe(RequisitionStatus.PENDING_APPROVAL);
  });

  it('AC3+AC4: HR Manager ghi đè kèm lý do => APPROVED, budgetOverridden=true, có nhật ký', async () => {
    const r = await toPending(4);
    const a = await svc.approve(r.id, { override: { reason: 'Dự án khách hàng X ký thêm' } }, f.hr);
    expect(a.status).toBe(RequisitionStatus.APPROVED);
    expect(a.budgetOverridden).toBe(true);
    const logs = await budget.listLogs({ action: 'BUDGET_OVERRIDE' as never });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ requisitionId: r.id, reason: 'Dự án khách hàng X ký thêm', userId: f.hr.id });
    // số còn lại âm: phản ánh đúng việc đã vượt
    expect((await budget.summarize(f.deptIt.id, YEAR)).headcountRemaining).toBe(-1);
  });

  it('ghi đè bị từ chối thì KHÔNG để lại nhật ký (transaction rollback)', async () => {
    const r = await toPending(4);
    await expect(svc.approve(r.id, { override: { reason: 'ngắn' } }, f.hr)).rejects.toBeDefined();
    expect(await budget.listLogs({ action: 'BUDGET_OVERRIDE' as never })).toHaveLength(0);
  });

  it('huỷ yêu cầu đã duyệt => headcount được trả lại', async () => {
    const r = await toPending(3);
    await svc.approve(r.id, {}, f.approver);
    expect((await budget.summarize(f.deptIt.id, YEAR)).headcountRemaining).toBe(0);
    await svc.cancel(r.id, f.hmIt);
    expect((await budget.summarize(f.deptIt.id, YEAR)).headcountRemaining).toBe(3);
  });

  it('yêu cầu đã duyệt trước đó làm giảm số còn lại cho yêu cầu sau', async () => {
    const first = await toPending(3);
    await svc.approve(first.id, {}, f.approver);
    const second = await toPending(1);
    await expect(svc.approve(second.id, {}, f.approver)).rejects.toMatchObject({
      response: { code: 'HEADCOUNT_BUDGET_EXCEEDED', details: { headcountRemaining: 0 } },
    });
  });

  it('yêu cầu REJECTED/CANCELLED/DRAFT không chiếm headcount', async () => {
    for (const status of [RequisitionStatus.REJECTED, RequisitionStatus.CANCELLED, RequisitionStatus.DRAFT]) {
      await insertRequisition(mod, { departmentId: f.deptIt.id, quantity: 3, status, createdBy: f.hr.id });
    }
    const r = await toPending(3);
    await expect(svc.approve(r.id, {}, f.approver)).resolves.toMatchObject({ status: RequisitionStatus.APPROVED });
  });

  it('kiểm tra trạng thái hợp lệ & không tồn tại', async () => {
    const r = await draft(1);
    await expect(svc.approve(r.id, {}, f.approver)).rejects.toMatchObject({ response: { code: 'INVALID_STATUS' } }); // chưa submit
    await expect(svc.approve(9999, {}, f.approver)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.findOne(9999, f.hr)).rejects.toBeInstanceOf(NotFoundException);
    await svc.submit(r.id, f.hmIt);
    await expect(svc.submit(r.id, f.hmIt)).rejects.toBeInstanceOf(ConflictException); // submit 2 lần
    await svc.cancel(r.id, f.hmIt);
    await expect(svc.cancel(r.id, f.hmIt)).rejects.toBeInstanceOf(ConflictException); // huỷ 2 lần
  });

  it('hai yêu cầu duyệt lần lượt không thể cùng vượt chỉ tiêu', async () => {
    const a = await toPending(2);
    const b = await toPending(2);
    await svc.approve(a.id, {}, f.approver);
    await expect(svc.approve(b.id, {}, f.approver)).rejects.toBeInstanceOf(ConflictException);
  });
});

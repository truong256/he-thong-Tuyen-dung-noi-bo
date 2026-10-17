/**
 * Kiểm chứng ĐÚNG từng Acceptance Criteria + Technical Notes của S3-07.
 * Chạy riêng: npm run test:ac
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { REASONS } from '../src/domain/reasons.ts';
import { TRANSITIONS } from '../src/domain/stateMachine.ts';
import { HR, setup, T0 } from './helpers.ts';

function arrange() {
  const c = setup();
  c.store.seedRequisition({ id: 'R1', status: 'APPROVED' });
  c.store.seedPosting({ id: 'P1', requisitionId: 'R1', status: 'PUBLISHED' });
  return c;
}

describe('S3-07 | AC1 - Hỗ trợ Đã tuyển đủ, Tạm dừng, Huỷ với lý do tương ứng', () => {
  for (const [target, code] of [['FILLED', 'HEADCOUNT_REACHED'], ['PAUSED', 'PLAN_CHANGE'], ['CANCELLED', 'NO_LONGER_NEEDED']] as const) {
    it(`${target} thành công với lý do ${code} và lưu lý do`, async () => {
      const { service } = arrange();
      const res = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: target, reasonCode: code });
      assert.equal(res.requisition.status, target);
      assert.equal(res.requisition.statusReasonCode, code);
    });
    it(`${target} không có lý do bị từ chối`, async () => {
      const { service } = arrange();
      await assert.rejects(service.changeStatus(HR, { requisitionId: 'R1', targetStatus: target }), { code: 'REASON_REQUIRED' });
    });
  }
  it('mỗi trạng thái có bộ lý do riêng, không dùng chung lý do ngoại trừ "Lý do khác"', () => {
    const own = (s: 'FILLED' | 'PAUSED' | 'CANCELLED') => (REASONS[s] ?? []).map((r) => r.code).filter((c) => c !== 'OTHER');
    const all = [...own('FILLED'), ...own('PAUSED'), ...own('CANCELLED')];
    assert.equal(new Set(all).size, all.length);
  });
});

describe('S3-07 | AC2 - Đóng hoặc huỷ tự động gỡ tin đang đăng', () => {
  for (const [target, code] of [['FILLED', 'HEADCOUNT_REACHED'], ['CANCELLED', 'BUDGET_CUT']] as const) {
    it(`${target}: tin đang đăng chuyển sang UNPUBLISHED ngay trong cùng thao tác`, async () => {
      const { service, store } = arrange();
      const res = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: target, reasonCode: code });
      assert.equal(store.postingsById.get('P1')?.status, 'UNPUBLISHED');
      assert.deepEqual(res.unpublishedPostingIds, ['P1']);
      assert.deepEqual(await store.findPublishedByRequisition('R1'), []);
    });
  }
});

describe('S3-07 | AC3 - Cảnh báo khi còn ứng viên trong pipeline trước khi đóng', () => {
  it('đóng/huỷ khi còn ứng viên: bị chặn bằng PIPELINE_WARNING cho tới khi xác nhận', async () => {
    for (const [target, code] of [['FILLED', 'HEADCOUNT_REACHED'], ['CANCELLED', 'BUDGET_CUT']] as const) {
      const { service, store } = arrange();
      store.seedPipeline('R1', { SCREENING: 1 });
      await assert.rejects(service.changeStatus(HR, { requisitionId: 'R1', targetStatus: target, reasonCode: code }), { code: 'PIPELINE_WARNING' });
      assert.equal(store.postingsById.get('P1')?.status, 'PUBLISHED');
      const ok = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: target, reasonCode: code, acknowledgePipelineWarning: true });
      assert.equal(ok.requisition.status, target);
    }
  });
});

describe('S3-07 | AC4 - Ghi lại người thao tác và thời điểm', () => {
  it('nhật ký có actorId, actorRole, occurredAt; requisition lưu statusChangedBy/At', async () => {
    const { service, store, clock } = arrange();
    clock.set('2026-10-09T10:15:00.000Z');
    await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' });
    assert.equal(store.historyEntries[0]?.actorId, HR.id);
    assert.equal(store.historyEntries[0]?.occurredAt, '2026-10-09T10:15:00.000Z');
    assert.equal(store.requisitionsById.get('R1')?.statusChangedBy, HR.id);
    assert.notEqual(store.requisitionsById.get('R1')?.statusChangedAt, T0);
  });
});

describe('S3-07 | Technical Notes', () => {
  it('TN1 - state machine: trạng thái cuối không có cạnh đi ra', () => {
    assert.deepEqual(TRANSITIONS.FILLED, []);
    assert.deepEqual(TRANSITIONS.CANCELLED, []);
  });
  it('TN2 - nhất quán tin/yêu cầu: gỡ tin lỗi thì trạng thái KHÔNG đổi (atomic)', async () => {
    const { service, store } = arrange();
    store.failUnpublishFor.add('P1');
    await assert.rejects(service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' }), { code: 'UNPUBLISH_FAILED' });
    assert.equal(store.requisitionsById.get('R1')?.status, 'APPROVED');
    assert.equal(store.postingsById.get('P1')?.status, 'PUBLISHED');
  });
  it('DoD - quyền kiểm ở backend: vai trò không phải HR Manager bị chặn', async () => {
    const { service } = arrange();
    await assert.rejects(service.changeStatus({ id: 'u', role: 'RECRUITER' }, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' }), { code: 'FORBIDDEN' });
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HR, RECRUITER, setup, T0 } from './helpers.ts';

function seed(status: 'APPROVED' | 'PAUSED' | 'DRAFT' | 'FILLED' | 'CANCELLED' = 'APPROVED') {
  const ctx = setup();
  ctx.store.seedRequisition({ id: 'R1', status });
  ctx.store.seedPosting({ id: 'P1', requisitionId: 'R1', status: 'PUBLISHED' });
  ctx.store.seedPosting({ id: 'P2', requisitionId: 'R1', status: 'PUBLISHED' });
  ctx.store.seedPosting({ id: 'P3', requisitionId: 'R1', status: 'DRAFT' });
  ctx.store.seedPosting({ id: 'OTHER', requisitionId: 'R2', status: 'PUBLISHED' });
  return ctx;
}

describe('RequisitionLifecycleService.changeStatus', () => {
  it('tạm dừng: đổi trạng thái, lưu lý do, gỡ tin đang đăng', async () => {
    const { service, store } = seed();
    const res = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' });
    assert.equal(res.requisition.status, 'PAUSED');
    assert.equal(res.requisition.statusReasonCode, 'BUDGET_FREEZE');
    assert.deepEqual(res.unpublishedPostingIds.sort(), ['P1', 'P2']);
    assert.equal(store.postingsById.get('P1')?.status, 'UNPUBLISHED');
    assert.equal(store.postingsById.get('P3')?.status, 'DRAFT'); // tin nháp không bị đụng
    assert.equal(store.postingsById.get('OTHER')?.status, 'PUBLISHED'); // tin của yêu cầu khác không bị đụng
  });

  it('đóng (đã tuyển đủ) khi không còn ứng viên: thành công và gỡ tin', async () => {
    const { service } = seed();
    const res = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED' });
    assert.equal(res.requisition.status, 'FILLED');
    assert.equal(res.unpublishedPostingIds.length, 2);
    assert.equal(res.history.pipelineAcknowledged, 0);
  });

  it('huỷ: lưu ghi chú đã trim và gỡ tin', async () => {
    const { service } = seed();
    const res = await service.changeStatus(HR, {
      requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'OTHER', note: '  Sáp nhập phòng ban ',
    });
    assert.equal(res.requisition.status, 'CANCELLED');
    assert.equal(res.requisition.statusNote, 'Sáp nhập phòng ban');
  });

  it('tiếp tục từ Tạm dừng về Đã duyệt: không cần lý do, xoá lý do cũ, KHÔNG tự đăng lại tin', async () => {
    const { service, store } = seed();
    await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE' });
    const res = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'APPROVED' });
    assert.equal(res.requisition.status, 'APPROVED');
    assert.equal(res.requisition.statusReasonCode, null);
    assert.deepEqual(res.unpublishedPostingIds, []);
    assert.equal(store.postingsById.get('P1')?.status, 'UNPUBLISHED');
  });

  it('pipeline còn ứng viên: cảnh báo 409 kèm số lượng theo giai đoạn, KHÔNG đổi gì', async () => {
    const { service, store } = seed();
    store.seedPipeline('R1', { SCREENING: 3, INTERVIEW: 2 });
    await assert.rejects(
      service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED' }),
      (e: any) => e.code === 'PIPELINE_WARNING' && e.httpStatus === 409 && e.details.total === 5 && e.details.byStage.SCREENING === 3,
    );
    assert.equal(store.requisitionsById.get('R1')?.status, 'APPROVED');
    assert.equal(store.postingsById.get('P1')?.status, 'PUBLISHED');
    assert.equal(store.historyEntries.length, 0);
  });

  it('đã xác nhận cảnh báo: cho đóng và ghi số ứng viên đã xác nhận vào nhật ký', async () => {
    const { service, store } = seed();
    store.seedPipeline('R1', { NEW: 4 });
    const res = await service.changeStatus(HR, {
      requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT', acknowledgePipelineWarning: true,
    });
    assert.equal(res.requisition.status, 'CANCELLED');
    assert.equal(res.history.pipelineAcknowledged, 4);
  });

  it('tạm dừng KHÔNG bị chặn bởi cảnh báo pipeline', async () => {
    const { service, store } = seed();
    store.seedPipeline('R1', { OFFER: 1 });
    const res = await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' });
    assert.equal(res.requisition.status, 'PAUSED');
  });

  it('ghi nhật ký: người thao tác, vai trò, thời điểm, từ/đến, lý do, tin đã gỡ', async () => {
    const { service, store } = seed();
    await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE', note: 'Chờ ngân sách Q1' });
    const [h] = store.historyEntries;
    assert.ok(h);
    assert.equal(h.actorId, HR.id);
    assert.equal(h.actorRole, 'HR_MANAGER');
    assert.equal(h.occurredAt, T0);
    assert.equal(h.fromStatus, 'APPROVED');
    assert.equal(h.toStatus, 'PAUSED');
    assert.equal(h.reasonCode, 'PLAN_CHANGE');
    assert.equal(h.note, 'Chờ ngân sách Q1');
    assert.deepEqual(h.unpublishedPostingIds.sort(), ['P1', 'P2']);
    const r = store.requisitionsById.get('R1');
    assert.equal(r?.statusChangedBy, HR.id);
    assert.equal(r?.statusChangedAt, T0);
  });

  it('chuyển trạng thái không hợp lệ bị chặn (trạng thái cuối, nháp -> đã tuyển đủ, APPROVED từ nháp)', async () => {
    for (const [status, target] of [['FILLED', 'PAUSED'], ['CANCELLED', 'APPROVED'], ['DRAFT', 'FILLED'], ['DRAFT', 'APPROVED']] as const) {
      const { service } = seed(status);
      await assert.rejects(
        service.changeStatus(HR, { requisitionId: 'R1', targetStatus: target, reasonCode: 'OTHER', note: 'xxxxxxx' }),
        { code: 'INVALID_TRANSITION' },
        `${status} -> ${target}`,
      );
    }
  });

  it('đích nằm ngoài tập S3-07 (ví dụ REJECTED) bị chặn', async () => {
    const { service } = seed();
    await assert.rejects(service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'REJECTED' }), { code: 'INVALID_TRANSITION' });
  });

  it('thiếu lý do -> 422 và không đổi gì', async () => {
    const { service, store } = seed();
    await assert.rejects(service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'CANCELLED' }), { code: 'REASON_REQUIRED' });
    assert.equal(store.requisitionsById.get('R1')?.status, 'APPROVED');
  });

  it('yêu cầu không tồn tại -> NOT_FOUND', async () => {
    const { service } = seed();
    await assert.rejects(service.changeStatus(HR, { requisitionId: 'NOPE', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' }), { code: 'NOT_FOUND' });
  });

  it('phân quyền ở server: vai trò khác HR Manager bị 403, dữ liệu không đổi', async () => {
    const { service, store } = seed();
    for (const role of ['RECRUITER', 'HIRING_MANAGER', 'APPROVER', 'ADMIN', 'INTERVIEWER', 'CANDIDATE'] as const) {
      await assert.rejects(
        service.changeStatus({ id: 'x', role }, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' }),
        { code: 'FORBIDDEN' },
        role,
      );
    }
    assert.equal(store.requisitionsById.get('R1')?.status, 'APPROVED');
    assert.equal(store.historyEntries.length, 0);
  });

  it('gỡ tin thất bại -> rollback toàn bộ (trạng thái, tin đã gỡ trước đó, nhật ký)', async () => {
    const { service, store } = seed();
    store.failUnpublishFor.add('P2');
    await assert.rejects(
      service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' }),
      (e: any) => e.code === 'UNPUBLISH_FAILED' && e.details.postingId === 'P2',
    );
    assert.equal(store.requisitionsById.get('R1')?.status, 'APPROVED');
    assert.equal(store.postingsById.get('P1')?.status, 'PUBLISHED');
    assert.equal(store.postingsById.get('P2')?.status, 'PUBLISHED');
    assert.equal(store.historyEntries.length, 0);
  });

  it('xung đột đồng thời (version đổi giữa chừng) -> CONCURRENT_MODIFICATION và rollback', async () => {
    const { service, store } = seed();
    const realFind = store.findById.bind(store);
    store.findById = async (id: string) => {
      const r = await realFind(id);
      const live = store.requisitionsById.get(id);
      if (live) live.version += 1; // người khác ghi xen vào sau khi ta đọc
      return r;
    };
    await assert.rejects(
      service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' }),
      { code: 'CONCURRENT_MODIFICATION' },
    );
    assert.equal(store.postingsById.get('P1')?.status, 'PUBLISHED');
    assert.equal(store.historyEntries.length, 0);
  });

  it('thao tác lặp lại trên yêu cầu đã đóng bị chặn (idempotent an toàn)', async () => {
    const { service } = seed();
    await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' });
    await assert.rejects(
      service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' }),
      { code: 'INVALID_TRANSITION' },
    );
  });
});

describe('getHistory & reconcilePostings', () => {
  it('xem lịch sử: chỉ HR Manager, NOT_FOUND khi sai id, đủ thứ tự', async () => {
    const { service } = seed();
    await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' });
    await service.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'APPROVED' });
    const list = await service.getHistory(HR, 'R1');
    assert.deepEqual(list.map((h) => h.toStatus), ['PAUSED', 'APPROVED']);
    await assert.rejects(service.getHistory(RECRUITER, 'R1'), { code: 'FORBIDDEN' });
    await assert.rejects(service.getHistory(HR, 'NOPE'), { code: 'NOT_FOUND' });
  });

  it('reconcile gỡ tin còn treo của yêu cầu đã Tạm dừng/Đóng/Huỷ, bỏ qua yêu cầu Đã duyệt', async () => {
    const { service, store } = setup();
    store.seedRequisition({ id: 'A', status: 'CANCELLED' });
    store.seedRequisition({ id: 'B', status: 'APPROVED' });
    store.seedPosting({ id: 'PA', requisitionId: 'A', status: 'PUBLISHED' });
    store.seedPosting({ id: 'PB', requisitionId: 'B', status: 'PUBLISHED' });
    const fixed = await service.reconcilePostings();
    assert.deepEqual(fixed, ['PA']);
    assert.equal(store.postingsById.get('PA')?.status, 'UNPUBLISHED');
    assert.equal(store.postingsById.get('PB')?.status, 'PUBLISHED');
    assert.deepEqual(await service.reconcilePostings(), []);
  });
});

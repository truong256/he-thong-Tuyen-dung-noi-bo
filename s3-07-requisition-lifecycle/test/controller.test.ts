import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HR, RECRUITER, setup } from './helpers.ts';

function ctx() {
  const c = setup();
  c.store.seedRequisition({ id: 'R1', status: 'APPROVED' });
  c.store.seedPosting({ id: 'P1', requisitionId: 'R1', status: 'PUBLISHED' });
  return c;
}
const body = (r: { body: unknown }) => r.body as any;

describe('RequisitionStatusController', () => {
  it('200 khi thành công', async () => {
    const { controller } = ctx();
    const res = await controller.changeStatus({
      actor: HR, params: { id: 'R1' }, body: { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE', note: 'ok' },
    });
    assert.equal(res.status, 200);
    assert.equal(body(res).requisition.status, 'PAUSED');
    assert.deepEqual(body(res).unpublishedPostingIds, ['P1']);
  });

  it('chưa đăng nhập -> 403', async () => {
    const { controller } = ctx();
    assert.equal((await controller.changeStatus({ actor: null, params: { id: 'R1' }, body: {} })).status, 403);
    assert.equal((await controller.history({ actor: null, params: { id: 'R1' } })).status, 403);
  });

  it('sai vai trò -> 403 với mã FORBIDDEN', async () => {
    const { controller } = ctx();
    const res = await controller.changeStatus({ actor: RECRUITER, params: { id: 'R1' }, body: { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' } });
    assert.equal(res.status, 403);
    assert.equal(body(res).error.code, 'FORBIDDEN');
  });

  it('body sai kiểu -> 422 VALIDATION_ERROR', async () => {
    const { controller } = ctx();
    for (const bad of [undefined, null, 'x', [], {}, { targetStatus: 'BOGUS' }, { targetStatus: 'PAUSED', reasonCode: 5 }, { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE', note: 5 }]) {
      const res = await controller.changeStatus({ actor: HR, params: { id: 'R1' }, body: bad });
      assert.equal(res.status, 422, JSON.stringify(bad));
      assert.equal(body(res).error.code, 'VALIDATION_ERROR');
    }
  });

  it('cảnh báo pipeline -> 409 PIPELINE_WARNING kèm chi tiết; gửi lại có xác nhận -> 200', async () => {
    const { controller, store } = ctx();
    store.seedPipeline('R1', { INTERVIEW: 2 });
    const payload = { targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED' };
    const first = await controller.changeStatus({ actor: HR, params: { id: 'R1' }, body: payload });
    assert.equal(first.status, 409);
    assert.equal(body(first).error.code, 'PIPELINE_WARNING');
    assert.equal(body(first).error.details.total, 2);
    const second = await controller.changeStatus({ actor: HR, params: { id: 'R1' }, body: { ...payload, acknowledgePipelineWarning: true } });
    assert.equal(second.status, 200);
  });

  it('acknowledgePipelineWarning phải là boolean true thật (chuỗi "true" không được tính)', async () => {
    const { controller, store } = ctx();
    store.seedPipeline('R1', { NEW: 1 });
    const res = await controller.changeStatus({
      actor: HR, params: { id: 'R1' }, body: { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT', acknowledgePipelineWarning: 'true' },
    });
    assert.equal(res.status, 409);
  });

  it('404 khi không có yêu cầu; 500 khi lỗi lạ không lộ chi tiết', async () => {
    const { controller, store } = ctx();
    const nf = await controller.changeStatus({ actor: HR, params: { id: 'NOPE' }, body: { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' } });
    assert.equal(nf.status, 404);
    store.findById = async () => { throw new Error('db password=secret'); };
    const boom = await controller.changeStatus({ actor: HR, params: { id: 'R1' }, body: { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' } });
    assert.equal(boom.status, 500);
    assert.equal(JSON.stringify(boom.body).includes('secret'), false);
  });

  it('GET lịch sử: 200 cho HR, 403 cho recruiter', async () => {
    const { controller } = ctx();
    await controller.changeStatus({ actor: HR, params: { id: 'R1' }, body: { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' } });
    const ok = await controller.history({ actor: HR, params: { id: 'R1' } });
    assert.equal(ok.status, 200);
    assert.equal((ok.body as unknown[]).length, 1);
    assert.equal((await controller.history({ actor: RECRUITER, params: { id: 'R1' } })).status, 403);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { submitStatusChange } from '../frontend/api.ts';
import type { FetchLike } from '../frontend/api.ts';
import { ACTIONS, availableActions, buildRequestBody, describePipelineWarning, validateForm } from '../frontend/dialogModel.ts';

describe('dialogModel', () => {
  it('nút hiển thị theo state machine', () => {
    assert.deepEqual(availableActions('APPROVED').sort(), ['CANCEL', 'CLOSE', 'PAUSE']);
    assert.deepEqual(availableActions('PAUSED').sort(), ['CANCEL', 'CLOSE']);
    assert.deepEqual(availableActions('FILLED'), []);
    assert.deepEqual(availableActions('CANCELLED'), []);
    assert.deepEqual(availableActions('DRAFT'), ['CANCEL']);
  });

  it('mỗi hành động ánh xạ đúng trạng thái đích và có lý do', () => {
    assert.equal(ACTIONS.PAUSE.targetStatus, 'PAUSED');
    assert.equal(ACTIONS.CLOSE.targetStatus, 'FILLED');
    assert.equal(ACTIONS.CANCEL.targetStatus, 'CANCELLED');
    for (const a of Object.values(ACTIONS)) assert.ok(a.reasons.length >= 3);
  });

  it('validateForm: thiếu lý do, lý do sai, "Lý do khác" thiếu ghi chú, ghi chú quá dài', () => {
    assert.ok(validateForm('PAUSE', { reasonCode: '', note: '' }).reasonCode);
    assert.ok(validateForm('PAUSE', { reasonCode: 'DUPLICATE_REQUEST', note: '' }).reasonCode);
    assert.ok(validateForm('CANCEL', { reasonCode: 'OTHER', note: ' ab ' }).note);
    assert.ok(validateForm('CANCEL', { reasonCode: 'BUDGET_CUT', note: 'x'.repeat(501) }).note);
    assert.deepEqual(validateForm('CANCEL', { reasonCode: 'BUDGET_CUT', note: '' }), {});
  });

  it('buildRequestBody: trim ghi chú, chỉ gắn acknowledge khi cần', () => {
    assert.deepEqual(buildRequestBody('PAUSE', { reasonCode: 'BUDGET_FREEZE', note: '  hi  ' }, false), {
      targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE', note: 'hi',
    });
    assert.deepEqual(buildRequestBody('CLOSE', { reasonCode: 'HEADCOUNT_REACHED', note: '' }, true), {
      targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED', acknowledgePipelineWarning: true,
    });
  });

  it('describePipelineWarning: dòng theo giai đoạn, bỏ giai đoạn 0, chịu được dữ liệu rỗng', () => {
    const v = describePipelineWarning({ total: 5, byStage: { SCREENING: 3, INTERVIEW: 2, OFFER: 0 } });
    assert.equal(v.total, 5);
    assert.deepEqual(v.lines, ['Sàng lọc: 3 ứng viên', 'Phỏng vấn: 2 ứng viên']);
    assert.deepEqual(describePipelineWarning(undefined), { total: 0, lines: [] });
  });
});

describe('api.submitStatusChange', () => {
  const body = { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' } as const;
  const mk = (status: number, payload: unknown): FetchLike => async () => ({ status, json: async () => payload });

  it('200 -> success; gửi đúng URL, method, Authorization', async () => {
    let seen: { url: string; init: any } | undefined;
    const f: FetchLike = async (url, init) => { seen = { url, init }; return { status: 200, json: async () => ({}) }; };
    assert.deepEqual(await submitStatusChange(f, 'R/1', body, 'tok'), { kind: 'success' });
    assert.equal(seen?.url, '/api/requisitions/R%2F1/status');
    assert.equal(seen?.init.method, 'POST');
    assert.equal(seen?.init.headers.Authorization, 'Bearer tok');
  });

  it('409 PIPELINE_WARNING -> pipeline-warning kèm details', async () => {
    const out = await submitStatusChange(mk(409, { error: { code: 'PIPELINE_WARNING', details: { total: 2 } } }), 'R1', body, 't');
    assert.deepEqual(out, { kind: 'pipeline-warning', details: { total: 2 } });
  });

  it('lỗi khác -> hiện message của server; không có body -> thông báo mặc định; mất mạng -> thông báo mạng', async () => {
    assert.deepEqual(await submitStatusChange(mk(403, { error: { message: 'Không có quyền' } }), 'R1', body, 't'), { kind: 'error', message: 'Không có quyền' });
    const noBody: FetchLike = async () => ({ status: 500, json: async () => { throw new Error('bad json'); } });
    assert.equal((await submitStatusChange(noBody, 'R1', body, 't') as any).message, 'Không thể thực hiện thao tác. Vui lòng thử lại.');
    const down: FetchLike = async () => { throw new Error('offline'); };
    assert.match((await submitStatusChange(down, 'R1', body, 't') as any).message, /Mất kết nối/);
  });
});

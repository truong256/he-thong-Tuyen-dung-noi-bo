/**
 * SCRUM-138 [TEST] Kiểm tra trạng thái và tích hợp tin tuyển dụng.
 * Chạy server HTTP thật (cổng ngẫu nhiên) và kiểm chứng từ API tới cổng công khai.
 */
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FixedClock } from '../src/adapters/inMemory.ts';
import { createDemoApp } from '../server/app.ts';
import { seedDemoData } from '../server/seed.ts';
import { T0 } from './helpers.ts';

const clock = new FixedClock(T0);
const { server, store } = createDemoApp(fileURLToPath(new URL('../public/', import.meta.url)), clock);
let base = '';

before(async () => {
  await new Promise<void>((ok) => server.listen(0, ok));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(() => { server.close(); });
beforeEach(() => { seedDemoData(store); store.failUnpublishFor.clear(); });

const HR = { Authorization: 'Bearer demo-hr', 'Content-Type': 'application/json' };
const RC = { Authorization: 'Bearer demo-recruiter', 'Content-Type': 'application/json' };

async function change(id: string, body: unknown, headers: Record<string, string> = HR) {
  const res = await fetch(`${base}/api/requisitions/${id}/status`, {
    method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}
const portal = async () => ((await (await fetch(`${base}/api/public/postings`)).json()) as { id: string }[]).map((p) => p.id);
const statusOf = (id: string) => store.requisitionsById.get(id)?.status;

describe('SCRUM-138 | Quyền truy cập ở server', () => {
  it('chưa đăng nhập -> 403 cho danh sách và đổi trạng thái', async () => {
    assert.equal((await fetch(`${base}/api/requisitions`)).status, 403);
    assert.equal((await change('R1', { targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE' }, {})).status, 403);
    assert.equal((await fetch(`${base}/api/me`)).status, 401);
  });
  it('Recruiter bị 403, trạng thái và tin không đổi', async () => {
    const r = await change('R1', { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT', acknowledgePipelineWarning: true }, RC);
    assert.equal(r.status, 403);
    assert.equal(statusOf('R1'), 'APPROVED');
    assert.ok((await portal()).includes('P1'));
  });
  it('/api/me trả đúng người dùng', async () => {
    const me = (await (await fetch(`${base}/api/me`, { headers: HR })).json()) as { role: string };
    assert.equal(me.role, 'HR_MANAGER');
  });
});

describe('SCRUM-138 | AC1 trạng thái + lý do', () => {
  for (const [target, code] of [['PAUSED', 'PLAN_CHANGE'], ['FILLED', 'HEADCOUNT_REACHED'], ['CANCELLED', 'NO_LONGER_NEEDED']] as const) {
    it(`${target}: thiếu lý do 422, đủ lý do 200`, async () => {
      assert.equal((await change('R2', { targetStatus: target })).body.error.code, 'REASON_REQUIRED');
      const ok = await change('R2', { targetStatus: target, reasonCode: code });
      assert.equal(ok.status, 200);
      assert.equal(statusOf('R2'), target);
    });
  }
  it('lý do thuộc trạng thái khác -> 422 INVALID_REASON; "Lý do khác" cần ghi chú', async () => {
    assert.equal((await change('R2', { targetStatus: 'PAUSED', reasonCode: 'BUDGET_CUT' })).body.error.code, 'INVALID_REASON');
    assert.equal((await change('R2', { targetStatus: 'PAUSED', reasonCode: 'OTHER' })).body.error.code, 'NOTE_REQUIRED');
  });
  it('JSON hỏng hoặc thiếu targetStatus -> 422', async () => {
    assert.equal((await change('R2', '{khong-phai-json')).status, 422);
    assert.equal((await change('R2', { reasonCode: 'PLAN_CHANGE' })).status, 422);
  });
});

describe('SCRUM-138 | AC2 + TN2 gỡ tin nhất quán với trạng thái (cổng công khai)', () => {
  for (const [target, code] of [['FILLED', 'HEADCOUNT_REACHED'], ['CANCELLED', 'BUDGET_CUT'], ['PAUSED', 'BUDGET_FREEZE']] as const) {
    it(`${target}: tin biến mất khỏi cổng công khai ngay sau thao tác`, async () => {
      assert.ok((await portal()).includes('P2'));
      assert.equal((await change('R2', { targetStatus: target, reasonCode: code })).status, 200);
      assert.ok(!(await portal()).includes('P2'));
    });
  }
  it('tạm dừng rồi tiếp tục: tin KHÔNG tự đăng lại', async () => {
    await change('R2', { targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE' });
    assert.equal((await change('R2', { targetStatus: 'APPROVED' })).status, 200);
    assert.equal(statusOf('R2'), 'APPROVED');
    assert.ok(!(await portal()).includes('P2'));
  });
  it('gỡ tin lỗi -> 502, hoàn tác toàn bộ: trạng thái, tin và nhật ký không đổi', async () => {
    store.failUnpublishFor.add('P2');
    const r = await change('R2', { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' });
    assert.equal(r.status, 502);
    assert.equal(statusOf('R2'), 'APPROVED');
    assert.ok((await portal()).includes('P2'));
    assert.equal(store.historyEntries.length, 0);
  });
});

describe('SCRUM-138 | AC3 cảnh báo pipeline', () => {
  it('còn ứng viên -> 409 PIPELINE_WARNING kèm số lượng; chưa gỡ tin; xác nhận mới đóng được', async () => {
    const warn = await change('R1', { targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED' });
    assert.equal(warn.status, 409);
    assert.equal(warn.body.error.code, 'PIPELINE_WARNING');
    assert.equal(warn.body.error.details.total, 8);
    assert.equal(statusOf('R1'), 'APPROVED');
    assert.ok((await portal()).includes('P1'));

    const ok = await change('R1', { targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED', acknowledgePipelineWarning: true });
    assert.equal(ok.status, 200);
    assert.ok(!(await portal()).includes('P1'));
  });
  it('tạm dừng không bị chặn bởi cảnh báo', async () => {
    assert.equal((await change('R1', { targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE' })).status, 200);
  });
});

describe('SCRUM-138 | AC4 nhật ký người thao tác + thời điểm', () => {
  it('lịch sử có người, vai trò, thời điểm, lý do, tin đã gỡ, số ứng viên đã xác nhận', async () => {
    await change('R1', { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT', acknowledgePipelineWarning: true });
    const res = await fetch(`${base}/api/requisitions/R1/status-history`, { headers: HR });
    const list = (await res.json()) as any[];
    assert.equal(list.length, 1);
    assert.deepEqual(
      { a: list[0].actorId, r: list[0].actorRole, t: list[0].occurredAt, c: list[0].reasonCode, u: list[0].unpublishedPostingIds, n: list[0].pipelineAcknowledged },
      { a: 'u-hr-01', r: 'HR_MANAGER', t: T0, c: 'BUDGET_CUT', u: ['P1'], n: 8 },
    );
    assert.equal((await fetch(`${base}/api/requisitions/R1/status-history`, { headers: RC })).status, 403);
  });
});

describe('SCRUM-138 | TN1 state machine', () => {
  it('trạng thái kết thúc không mở lại được; trạng thái chưa duyệt không tạm dừng/đóng được', async () => {
    await change('R2', { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' });
    assert.equal((await change('R2', { targetStatus: 'APPROVED' })).body.error.code, 'INVALID_TRANSITION');
    assert.equal((await change('R5', { targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE' })).body.error.code, 'INVALID_TRANSITION');
    assert.equal((await change('R6', { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' })).status, 409);
  });
  it('yêu cầu không tồn tại -> 404', async () => {
    assert.equal((await change('NOPE', { targetStatus: 'PAUSED', reasonCode: 'PLAN_CHANGE' })).status, 404);
  });
});

describe('SCRUM-138 | Hạ tầng demo', () => {
  it('danh sách yêu cầu có số tin đang đăng và pipeline; reset trả dữ liệu mẫu', async () => {
    const rows = (await (await fetch(`${base}/api/requisitions`, { headers: HR })).json()) as any[];
    assert.equal(rows.length, 6);
    assert.equal(rows.find((r) => r.id === 'R1').pipeline.total, 8);
    await change('R2', { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' });
    assert.equal((await fetch(`${base}/api/demo/reset`, { method: 'POST' })).status, 200);
    assert.equal(statusOf('R2'), 'APPROVED');
  });
  it('phục vụ trang chủ, chặn đường dẫn lạ và không cho thoát thư mục', async () => {
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.ok((await home.text()).includes('id="root"'));
    assert.equal((await fetch(`${base}/khong-co.js`)).status, 404);
    assert.equal((await fetch(`${base}/api/khong-co`)).status, 404);
    const raw = await new Promise<number>((ok) => {
      import('node:http').then(({ request }) => {
        const r = request(`${base}/..%2f..%2fpackage.json`, (res) => ok(res.statusCode ?? 0));
        r.end();
      });
    });
    assert.equal(raw, 404);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PostgresStore } from '../src/adapters/postgres.ts';
import type { PgClientLike, PgPoolLike } from '../src/adapters/postgres.ts';
import { RequisitionLifecycleService } from '../src/service/requisitionLifecycleService.ts';
import { HR, T0 } from './helpers.ts';
import { FixedClock } from '../src/adapters/inMemory.ts';

type Reply = { rows: any[]; rowCount: number | null };
function fakePool(handler: (sql: string, params?: unknown[]) => Reply | Promise<Reply>) {
  const log: string[] = [];
  let released = 0;
  const client: PgClientLike = {
    query: async (sql, params) => { log.push(sql.trim().split(/\s+/).slice(0, 2).join(' ')); return handler(sql, params); },
    release: () => { released++; },
  };
  const pool: PgPoolLike = { connect: async () => client, query: client.query };
  return { pool, log, released: () => released };
}
const ok = (rows: any[] = [], rowCount = rows.length): Reply => ({ rows, rowCount });
const reqRow = { id: 'R1', code: 'REQ-1', title: 'Dev', status: 'APPROVED', status_reason_code: null, status_note: null, status_changed_by: null, status_changed_at: null, version: 3 };

describe('PostgresStore', () => {
  it('run(): BEGIN -> COMMIT khi thành công, trả kết quả và trả kết nối về pool', async () => {
    const { pool, log, released } = fakePool(() => ok());
    const s = new PostgresStore(pool);
    assert.equal(await s.run(async () => { await s.unpublish('P1', 'x'); return 42; }), 42);
    assert.deepEqual(log, ['BEGIN', 'UPDATE job_postings', 'COMMIT']);
    assert.equal(released(), 1);
  });

  it('run(): lỗi -> ROLLBACK, ném lại đúng lỗi, vẫn trả kết nối', async () => {
    const { pool, log, released } = fakePool(() => ok());
    const s = new PostgresStore(pool);
    await assert.rejects(s.run(async () => { throw new Error('boom'); }), /boom/);
    assert.deepEqual(log, ['BEGIN', 'ROLLBACK']);
    assert.equal(released(), 1);
  });

  it('run() lồng nhau dùng chung giao dịch (không BEGIN lần hai)', async () => {
    const { pool, log } = fakePool(() => ok());
    const s = new PostgresStore(pool);
    await s.run(() => s.run(async () => { await s.unpublish('P1', 'x'); }));
    assert.equal(log.filter((l) => l === 'BEGIN').length, 1);
  });

  it('findById: có FOR UPDATE trong giao dịch, không có ngoài giao dịch; ánh xạ đúng', async () => {
    const sqls: string[] = [];
    const { pool } = fakePool((sql) => { sqls.push(sql); return ok([{ ...reqRow, status_changed_at: new Date(T0) }]); });
    const s = new PostgresStore(pool);
    const outside = await s.findById('R1');
    assert.equal(outside?.version, 3);
    assert.equal(outside?.statusChangedAt, T0);
    await s.run(() => s.findById('R1'));
    assert.ok(!sqls[0]!.includes('FOR UPDATE'));
    assert.ok(sqls.find((x) => x.includes('FOR UPDATE')));
    const none = new PostgresStore(fakePool(() => ok([])).pool);
    assert.equal(await none.findById('X'), null);
  });

  it('save(): rowCount 0 (version đã đổi) -> CONCURRENT_MODIFICATION; kiểm tra version trong WHERE', async () => {
    let sql = '';
    const { pool } = fakePool((q) => { sql = q; return ok([], 0); });
    const s = new PostgresStore(pool);
    const r = { id: 'R1', code: 'c', title: 't', status: 'PAUSED', statusReasonCode: 'BUDGET_FREEZE', statusNote: null, statusChangedBy: 'u', statusChangedAt: T0, version: 4 } as const;
    await assert.rejects(s.save(r, 3), { code: 'CONCURRENT_MODIFICATION' });
    assert.match(sql, /AND version = \$8/);
    const good = new PostgresStore(fakePool(() => ok([], 1)).pool);
    await good.save(r, 3);
  });

  it('countActiveByStage: gộp theo giai đoạn và cộng tổng', async () => {
    const { pool } = fakePool(() => ok([{ stage: 'SCREENING', n: 3 }, { stage: 'OFFER', n: '2' }]));
    assert.deepEqual(await new PostgresStore(pool).countActiveByStage('R1'), { total: 5, byStage: { SCREENING: 3, OFFER: 2 } });
  });

  it('findPublishedByRequisition / findByStatuses / history: ánh xạ hàng DB', async () => {
    const posting = await new PostgresStore(fakePool(() => ok([{ id: 7, requisition_id: 'R1', status: 'PUBLISHED' }])).pool).findPublishedByRequisition('R1');
    assert.deepEqual(posting, [{ id: '7', requisitionId: 'R1', status: 'PUBLISHED' }]);

    const byStatus = await new PostgresStore(fakePool(() => ok([{ ...reqRow, status: 'PAUSED', status_changed_by: 'u1' }])).pool).findByStatuses(['PAUSED']);
    assert.equal(byStatus[0]?.statusChangedBy, 'u1');

    const hist = await new PostgresStore(fakePool(() => ok([{
      id: 1, requisition_id: 'R1', from_status: 'APPROVED', to_status: 'PAUSED', reason_code: 'BUDGET_FREEZE', note: null,
      actor_id: 'u1', actor_role: 'HR_MANAGER', occurred_at: new Date(T0), unpublished_posting_ids: ['P1'], pipeline_acknowledged: 0,
    }])).pool).listByRequisition('R1');
    assert.equal(hist[0]?.occurredAt, T0);
    assert.deepEqual(hist[0]?.unpublishedPostingIds, ['P1']);

    const appended = await new PostgresStore(fakePool(() => ok([{ id: 9 }])).pool).append({
      requisitionId: 'R1', fromStatus: 'APPROVED', toStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE', note: null,
      actorId: 'u1', actorRole: 'HR_MANAGER', occurredAt: T0, unpublishedPostingIds: [], pipelineAcknowledged: 0,
    });
    assert.equal(appended.id, '9');
  });

  it('end-to-end qua service: đóng yêu cầu chạy BEGIN -> SELECT -> UPDATE posting -> UPDATE requisition -> INSERT history -> COMMIT', async () => {
    const { pool, log } = fakePool((sql) => {
      if (sql.includes('FROM requisitions WHERE id')) return ok([reqRow]);
      if (sql.includes('FROM applications')) return ok([]);
      if (sql.includes('FROM job_postings')) return ok([{ id: 'P1', requisition_id: 'R1', status: 'PUBLISHED' }]);
      if (sql.includes('UPDATE requisitions')) return ok([], 1);
      if (sql.includes('INSERT INTO requisition_status_history')) return ok([{ id: 1 }]);
      return ok();
    });
    const s = new PostgresStore(pool);
    const svc = new RequisitionLifecycleService({ uow: s, requisitions: s, postings: s, pipeline: s, history: s, clock: new FixedClock(T0) });
    const res = await svc.changeStatus(HR, { requisitionId: 'R1', targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT' });
    assert.deepEqual(res.unpublishedPostingIds, ['P1']);
    assert.deepEqual(log, ['BEGIN', 'SELECT id,', 'SELECT stage,', 'SELECT id,', 'UPDATE job_postings', 'UPDATE requisitions', 'INSERT INTO', 'COMMIT']);
  });
});

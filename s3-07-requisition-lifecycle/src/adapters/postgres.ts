import { AsyncLocalStorage } from 'node:async_hooks';
import { DomainError } from '../domain/errors.ts';
import { ACTIVE_PIPELINE_STAGES } from '../domain/types.ts';
import type {
  ActivePipelineStage,
  JobPosting,
  PipelineSummary,
  Requisition,
  RequisitionStatus,
  StatusHistoryEntry,
} from '../domain/types.ts';
import type {
  CandidatePipelineReader,
  Clock,
  JobPostingGateway,
  RequisitionRepository,
  StatusHistoryRepository,
  UnitOfWork,
} from '../ports.ts';

/** Giao diện tối thiểu, khớp `pg.Pool` / `pg.PoolClient` nên không cần import thư viện `pg` ở đây. */
export interface PgClientLike {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
  release(): void;
}
export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

/**
 * Cài đặt các port bằng PostgreSQL. Tên bảng theo migration `db/001_*.sql`:
 *   requisitions, job_postings, requisition_status_history
 * và bảng hồ sơ ứng tuyển `applications(requisition_id, stage)` (S4/S5) - đổi tên ở hằng số bên dưới nếu khác.
 */
export const APPLICATIONS_TABLE = 'applications';

export class PostgresStore
  implements RequisitionRepository, JobPostingGateway, CandidatePipelineReader, StatusHistoryRepository, UnitOfWork
{
  private readonly pool: PgPoolLike;
  private readonly txn = new AsyncLocalStorage<PgClientLike>();

  constructor(pool: PgPoolLike) {
    this.pool = pool;
  }

  private q(text: string, values?: unknown[]) {
    const tx = this.txn.getStore();
    return (tx ?? this.pool).query(text, values);
  }

  // --- UnitOfWork: mọi truy vấn trong fn dùng CHUNG một kết nối/giao dịch
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.txn.getStore()) return fn(); // đã ở trong giao dịch
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await this.txn.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  // --- RequisitionRepository
  async findById(id: string): Promise<Requisition | null> {
    // FOR UPDATE: khoá dòng để hai người không đổi trạng thái cùng lúc
    const { rows } = await this.q(
      `SELECT id, code, title, status, status_reason_code, status_note, status_changed_by, status_changed_at, version
         FROM requisitions WHERE id = $1 ${this.txn.getStore() ? 'FOR UPDATE' : ''}`,
      [id],
    );
    return rows[0] ? this.mapRequisition(rows[0]) : null;
  }

  async save(u: Requisition, expectedVersion: number): Promise<void> {
    const res = await this.q(
      `UPDATE requisitions
          SET status = $2, status_reason_code = $3, status_note = $4,
              status_changed_by = $5, status_changed_at = $6, version = $7
        WHERE id = $1 AND version = $8`,
      [u.id, u.status, u.statusReasonCode, u.statusNote, u.statusChangedBy, u.statusChangedAt, u.version, expectedVersion],
    );
    if (res.rowCount !== 1) {
      throw new DomainError('CONCURRENT_MODIFICATION', 'Yêu cầu vừa được người khác thay đổi. Hãy tải lại.');
    }
  }

  async findByStatuses(statuses: readonly RequisitionStatus[]): Promise<Requisition[]> {
    const { rows } = await this.q(
      `SELECT id, code, title, status, status_reason_code, status_note, status_changed_by, status_changed_at, version
         FROM requisitions WHERE status = ANY($1::text[])`,
      [statuses],
    );
    return rows.map((r) => this.mapRequisition(r));
  }

  // --- JobPostingGateway
  async findPublishedByRequisition(requisitionId: string): Promise<JobPosting[]> {
    const { rows } = await this.q(
      `SELECT id, requisition_id, status FROM job_postings WHERE requisition_id = $1 AND status = 'PUBLISHED'`,
      [requisitionId],
    );
    return rows.map((r) => ({ id: String(r.id), requisitionId: String(r.requisition_id), status: r.status }));
  }

  async unpublish(postingId: string, _cause: string): Promise<void> {
    await this.q(`UPDATE job_postings SET status = 'UNPUBLISHED' WHERE id = $1`, [postingId]);
  }

  // --- CandidatePipelineReader
  async countActiveByStage(requisitionId: string): Promise<PipelineSummary> {
    const { rows } = await this.q(
      `SELECT stage, COUNT(*)::int AS n FROM ${APPLICATIONS_TABLE}
        WHERE requisition_id = $1 AND stage = ANY($2::text[]) GROUP BY stage`,
      [requisitionId, [...ACTIVE_PIPELINE_STAGES]],
    );
    const byStage: Partial<Record<ActivePipelineStage, number>> = {};
    let total = 0;
    for (const r of rows) {
      byStage[r.stage as ActivePipelineStage] = Number(r.n);
      total += Number(r.n);
    }
    return { total, byStage };
  }

  // --- StatusHistoryRepository
  async append(e: Omit<StatusHistoryEntry, 'id'>): Promise<StatusHistoryEntry> {
    const { rows } = await this.q(
      `INSERT INTO requisition_status_history
         (requisition_id, from_status, to_status, reason_code, note, actor_id, actor_role, occurred_at,
          unpublished_posting_ids, pipeline_acknowledged)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::uuid[],$10) RETURNING id`,
      [e.requisitionId, e.fromStatus, e.toStatus, e.reasonCode, e.note, e.actorId, e.actorRole, e.occurredAt,
        e.unpublishedPostingIds, e.pipelineAcknowledged],
    );
    return { ...e, id: String(rows[0].id) };
  }

  async listByRequisition(requisitionId: string): Promise<StatusHistoryEntry[]> {
    const { rows } = await this.q(
      `SELECT * FROM requisition_status_history WHERE requisition_id = $1 ORDER BY occurred_at, id`,
      [requisitionId],
    );
    return rows.map((r) => ({
      id: String(r.id), requisitionId: String(r.requisition_id), fromStatus: r.from_status, toStatus: r.to_status,
      reasonCode: r.reason_code, note: r.note, actorId: String(r.actor_id), actorRole: r.actor_role,
      occurredAt: new Date(r.occurred_at).toISOString(),
      unpublishedPostingIds: (r.unpublished_posting_ids ?? []).map(String), pipelineAcknowledged: r.pipeline_acknowledged,
    }));
  }

  private mapRequisition(r: any): Requisition {
    return {
      id: String(r.id), code: r.code, title: r.title, status: r.status,
      statusReasonCode: r.status_reason_code, statusNote: r.status_note,
      statusChangedBy: r.status_changed_by ? String(r.status_changed_by) : null,
      statusChangedAt: r.status_changed_at ? new Date(r.status_changed_at).toISOString() : null,
      version: Number(r.version),
    };
  }
}

export const systemClock: Clock = { now: () => new Date().toISOString() };

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

/** Bộ nhớ tạm dùng cho test và demo; bản PostgreSQL thay thế qua các port. */
export class InMemoryStore implements RequisitionRepository, JobPostingGateway, CandidatePipelineReader, StatusHistoryRepository, UnitOfWork {
  requisitionsById = new Map<string, Requisition>();
  postingsById = new Map<string, JobPosting>();
  pipelineByReq = new Map<string, Partial<Record<ActivePipelineStage, number>>>();
  historyEntries: StatusHistoryEntry[] = [];
  /** Test hook: id tin sẽ gây lỗi khi gỡ. */
  failUnpublishFor = new Set<string>();
  private seq = 0;

  seedRequisition(r: Partial<Requisition> & Pick<Requisition, 'id'>): Requisition {
    const full: Requisition = {
      code: `REQ-${r.id}`,
      title: 'Backend Developer',
      status: 'APPROVED',
      statusReasonCode: null,
      statusNote: null,
      statusChangedBy: null,
      statusChangedAt: null,
      version: 1,
      ...r,
    };
    this.requisitionsById.set(full.id, full);
    return full;
  }

  seedPosting(p: JobPosting): void {
    this.postingsById.set(p.id, { ...p });
  }

  seedPipeline(requisitionId: string, byStage: Partial<Record<ActivePipelineStage, number>>): void {
    this.pipelineByReq.set(requisitionId, byStage);
  }

  // --- RequisitionRepository
  async findById(id: string): Promise<Requisition | null> {
    const r = this.requisitionsById.get(id);
    return r ? { ...r } : null;
  }

  async save(updated: Requisition, expectedVersion: number): Promise<void> {
    const stored = this.requisitionsById.get(updated.id);
    if (!stored || stored.version !== expectedVersion) {
      throw new DomainError('CONCURRENT_MODIFICATION', 'Yêu cầu vừa được người khác thay đổi. Hãy tải lại.');
    }
    this.requisitionsById.set(updated.id, { ...updated });
  }

  async findByStatuses(statuses: readonly RequisitionStatus[]): Promise<Requisition[]> {
    return [...this.requisitionsById.values()].filter((r) => statuses.includes(r.status)).map((r) => ({ ...r }));
  }

  // --- JobPostingGateway
  async findPublishedByRequisition(requisitionId: string): Promise<JobPosting[]> {
    return [...this.postingsById.values()]
      .filter((p) => p.requisitionId === requisitionId && p.status === 'PUBLISHED')
      .map((p) => ({ ...p }));
  }

  async unpublish(postingId: string, _cause: string): Promise<void> {
    if (this.failUnpublishFor.has(postingId)) throw new Error('portal unavailable');
    const p = this.postingsById.get(postingId);
    if (p) p.status = 'UNPUBLISHED';
  }

  // --- CandidatePipelineReader
  async countActiveByStage(requisitionId: string): Promise<PipelineSummary> {
    const byStage = this.pipelineByReq.get(requisitionId) ?? {};
    const total = ACTIVE_PIPELINE_STAGES.reduce((sum, s) => sum + (byStage[s] ?? 0), 0);
    return { total, byStage };
  }

  // --- StatusHistoryRepository
  async append(entry: Omit<StatusHistoryEntry, 'id'>): Promise<StatusHistoryEntry> {
    const saved = { ...entry, id: `H${++this.seq}` };
    this.historyEntries.push(saved);
    return { ...saved };
  }

  async listByRequisition(requisitionId: string): Promise<StatusHistoryEntry[]> {
    return this.historyEntries.filter((h) => h.requisitionId === requisitionId).map((h) => ({ ...h }));
  }

  // --- UnitOfWork: snapshot + rollback
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const snap = {
      reqs: new Map([...this.requisitionsById].map(([k, v]) => [k, { ...v }])),
      posts: new Map([...this.postingsById].map(([k, v]) => [k, { ...v }])),
      history: [...this.historyEntries],
    };
    try {
      return await fn();
    } catch (err) {
      this.requisitionsById = snap.reqs;
      this.postingsById = snap.posts;
      this.historyEntries = snap.history;
      throw err;
    }
  }
}

export class FixedClock implements Clock {
  private current: string;
  constructor(iso: string) {
    this.current = iso;
  }
  now(): string {
    return this.current;
  }
  set(iso: string): void {
    this.current = iso;
  }
}

import type {
  JobPosting,
  PipelineSummary,
  Requisition,
  RequisitionStatus,
  StatusHistoryEntry,
} from './domain/types.ts';

export interface RequisitionRepository {
  findById(id: string): Promise<Requisition | null>;
  /** Ghi kèm khoá lạc quan; ném CONCURRENT_MODIFICATION nếu version đã đổi. */
  save(updated: Requisition, expectedVersion: number): Promise<void>;
  findByStatuses(statuses: readonly RequisitionStatus[]): Promise<Requisition[]>;
}

export interface JobPostingGateway {
  findPublishedByRequisition(requisitionId: string): Promise<JobPosting[]>;
  /** Gỡ tin khỏi cổng công khai NGAY (tin biến mất khỏi trang công khai). */
  unpublish(postingId: string, cause: string): Promise<void>;
}

export interface CandidatePipelineReader {
  countActiveByStage(requisitionId: string): Promise<PipelineSummary>;
}

export interface StatusHistoryRepository {
  /** Append-only: không có update/delete. */
  append(entry: Omit<StatusHistoryEntry, 'id'>): Promise<StatusHistoryEntry>;
  listByRequisition(requisitionId: string): Promise<StatusHistoryEntry[]>;
}

/** Ranh giới giao dịch: lỗi bất kỳ trong fn => rollback toàn bộ (trạng thái + tin + nhật ký). */
export interface UnitOfWork {
  run<T>(fn: () => Promise<T>): Promise<T>;
}

export interface Clock {
  now(): string; // ISO-8601 UTC
}

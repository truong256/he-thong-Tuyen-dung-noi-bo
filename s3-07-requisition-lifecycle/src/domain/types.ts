export const REQUISITION_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PAUSED',
  'FILLED',
  'CANCELLED',
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const STATUS_LABELS_VI: Record<RequisitionStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  PAUSED: 'Tạm dừng',
  FILLED: 'Đã tuyển đủ',
  CANCELLED: 'Huỷ',
};

export type Role =
  | 'CANDIDATE'
  | 'INTERVIEWER'
  | 'HIRING_MANAGER'
  | 'RECRUITER'
  | 'APPROVER'
  | 'HR_MANAGER'
  | 'ADMIN';

export interface Actor {
  id: string;
  role: Role;
}

export interface Requisition {
  id: string;
  code: string;
  title: string;
  status: RequisitionStatus;
  statusReasonCode: string | null;
  statusNote: string | null;
  statusChangedBy: string | null;
  statusChangedAt: string | null;
  /** Khoá lạc quan: tăng 1 sau mỗi lần ghi. */
  version: number;
}

export type PostingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'EXPIRED';

export interface JobPosting {
  id: string;
  requisitionId: string;
  status: PostingStatus;
}

/** Giai đoạn pipeline (S5-02). Chỉ NEW..OFFER là "đang trong pipeline". */
export const ACTIVE_PIPELINE_STAGES = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER'] as const;
export type ActivePipelineStage = (typeof ACTIVE_PIPELINE_STAGES)[number];

export interface PipelineSummary {
  total: number;
  byStage: Partial<Record<ActivePipelineStage, number>>;
}

export interface StatusHistoryEntry {
  id: string;
  requisitionId: string;
  fromStatus: RequisitionStatus;
  toStatus: RequisitionStatus;
  reasonCode: string | null;
  note: string | null;
  actorId: string;
  actorRole: Role;
  occurredAt: string;
  unpublishedPostingIds: string[];
  pipelineAcknowledged: number;
}

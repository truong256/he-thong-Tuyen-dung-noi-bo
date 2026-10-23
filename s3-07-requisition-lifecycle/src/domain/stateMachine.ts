import { DomainError } from './errors.ts';
import type { RequisitionStatus } from './types.ts';
import { STATUS_LABELS_VI } from './types.ts';

/**
 * State machine của yêu cầu tuyển dụng.
 * Các cạnh DRAFT/PENDING_APPROVAL/REJECTED thuộc S3-02 (luồng duyệt) nhưng khai báo
 * ở đây để toàn bộ vòng đời nằm ở MỘT bảng chuyển trạng thái duy nhất.
 */
export const TRANSITIONS: Readonly<Record<RequisitionStatus, readonly RequisitionStatus[]>> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'DRAFT', 'CANCELLED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  APPROVED: ['PAUSED', 'FILLED', 'CANCELLED'],
  PAUSED: ['APPROVED', 'FILLED', 'CANCELLED'],
  FILLED: [],
  CANCELLED: [],
};

export function canTransition(from: RequisitionStatus, to: RequisitionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: RequisitionStatus, to: RequisitionStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `Không thể chuyển yêu cầu từ "${STATUS_LABELS_VI[from]}" sang "${STATUS_LABELS_VI[to]}".`,
      { from, to, allowed: TRANSITIONS[from] },
    );
  }
}

export function isTerminal(status: RequisitionStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Trạng thái mà tin tuyển dụng được phép ở chế độ đang đăng (nhất quán tin <-> yêu cầu). */
export function canHavePublishedPosting(status: RequisitionStatus): boolean {
  return status === 'APPROVED';
}

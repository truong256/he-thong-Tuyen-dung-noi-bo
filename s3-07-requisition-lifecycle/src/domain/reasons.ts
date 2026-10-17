import { DomainError } from './errors.ts';
import type { RequisitionStatus } from './types.ts';

export interface ReasonOption {
  code: string;
  label: string;
}

/** Mỗi trạng thái kết thúc có bộ lý do riêng (AC1). */
export const REASONS: Readonly<Partial<Record<RequisitionStatus, readonly ReasonOption[]>>> = {
  FILLED: [
    { code: 'HEADCOUNT_REACHED', label: 'Đã tuyển đủ số lượng' },
    { code: 'INTERNAL_TRANSFER', label: 'Đã bố trí nhân sự nội bộ' },
    { code: 'OTHER', label: 'Lý do khác' },
  ],
  PAUSED: [
    { code: 'BUDGET_FREEZE', label: 'Đóng băng ngân sách' },
    { code: 'PLAN_CHANGE', label: 'Thay đổi kế hoạch nhân sự' },
    { code: 'WAITING_FOR_DECISION', label: 'Chờ quyết định từ cấp trên' },
    { code: 'OTHER', label: 'Lý do khác' },
  ],
  CANCELLED: [
    { code: 'NO_LONGER_NEEDED', label: 'Không còn nhu cầu tuyển' },
    { code: 'BUDGET_CUT', label: 'Cắt giảm ngân sách' },
    { code: 'DUPLICATE_REQUEST', label: 'Yêu cầu bị trùng' },
    { code: 'OTHER', label: 'Lý do khác' },
  ],
};

export const NOTE_MIN_LENGTH_WHEN_OTHER = 5;
export const NOTE_MAX_LENGTH = 500;

export interface ValidReason {
  code: string;
  note: string | null;
}

export function requiresReason(target: RequisitionStatus): boolean {
  return REASONS[target] !== undefined;
}

export function validateReason(
  target: RequisitionStatus,
  reasonCode: string | undefined,
  note: string | undefined,
): ValidReason | null {
  const options = REASONS[target];
  if (!options) return null; // ví dụ: tiếp tục tuyển (PAUSED -> APPROVED)

  if (!reasonCode) {
    throw new DomainError('REASON_REQUIRED', 'Vui lòng chọn lý do.');
  }
  if (!options.some((o) => o.code === reasonCode)) {
    throw new DomainError('INVALID_REASON', 'Lý do không hợp lệ với trạng thái đã chọn.', {
      allowed: options.map((o) => o.code),
    });
  }
  const trimmed = note?.trim() ?? '';
  if (trimmed.length > NOTE_MAX_LENGTH) {
    throw new DomainError('VALIDATION_ERROR', `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự.`);
  }
  if (reasonCode === 'OTHER' && trimmed.length < NOTE_MIN_LENGTH_WHEN_OTHER) {
    throw new DomainError(
      'NOTE_REQUIRED',
      `Chọn "Lý do khác" thì phải nhập ghi chú (tối thiểu ${NOTE_MIN_LENGTH_WHEN_OTHER} ký tự).`,
    );
  }
  return { code: reasonCode, note: trimmed.length > 0 ? trimmed : null };
}

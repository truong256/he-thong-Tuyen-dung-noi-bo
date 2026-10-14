import { NOTE_MAX_LENGTH, NOTE_MIN_LENGTH_WHEN_OTHER, REASONS } from '../src/domain/reasons.ts';
import type { ReasonOption } from '../src/domain/reasons.ts';
import { canTransition } from '../src/domain/stateMachine.ts';
import type { ActivePipelineStage, RequisitionStatus } from '../src/domain/types.ts';

export type DialogAction = 'PAUSE' | 'CLOSE' | 'CANCEL';

export interface ActionConfig {
  targetStatus: RequisitionStatus;
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
  reasons: readonly ReasonOption[];
}

export const ACTIONS: Readonly<Record<DialogAction, ActionConfig>> = {
  PAUSE: {
    targetStatus: 'PAUSED',
    title: 'Tạm dừng tuyển dụng',
    description: 'Tin tuyển dụng đang đăng sẽ được gỡ khỏi cổng. Bạn có thể tiếp tục tuyển sau.',
    confirmLabel: 'Tạm dừng',
    danger: false,
    reasons: REASONS.PAUSED ?? [],
  },
  CLOSE: {
    targetStatus: 'FILLED',
    title: 'Đóng yêu cầu (đã tuyển đủ)',
    description: 'Yêu cầu sẽ kết thúc và tin tuyển dụng đang đăng sẽ được gỡ. Không thể mở lại.',
    confirmLabel: 'Đóng yêu cầu',
    danger: true,
    reasons: REASONS.FILLED ?? [],
  },
  CANCEL: {
    targetStatus: 'CANCELLED',
    title: 'Huỷ yêu cầu tuyển dụng',
    description: 'Yêu cầu sẽ bị huỷ và tin tuyển dụng đang đăng sẽ được gỡ. Không thể hoàn tác.',
    confirmLabel: 'Huỷ yêu cầu',
    danger: true,
    reasons: REASONS.CANCELLED ?? [],
  },
};

/** Nút nào được hiện theo trạng thái hiện tại (dùng chung state machine với backend). */
export function availableActions(current: RequisitionStatus): DialogAction[] {
  return (Object.keys(ACTIONS) as DialogAction[]).filter((a) => canTransition(current, ACTIONS[a].targetStatus));
}

export interface FormState {
  reasonCode: string;
  note: string;
}

export interface FormErrors {
  reasonCode?: string;
  note?: string;
}

export function validateForm(action: DialogAction, form: FormState): FormErrors {
  const errors: FormErrors = {};
  const cfg = ACTIONS[action];
  if (!form.reasonCode) {
    errors.reasonCode = 'Vui lòng chọn lý do.';
  } else if (!cfg.reasons.some((r) => r.code === form.reasonCode)) {
    errors.reasonCode = 'Lý do không hợp lệ.';
  }
  const note = form.note.trim();
  if (note.length > NOTE_MAX_LENGTH) errors.note = `Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự.`;
  if (form.reasonCode === 'OTHER' && note.length < NOTE_MIN_LENGTH_WHEN_OTHER) {
    errors.note = `Vui lòng nhập ghi chú (tối thiểu ${NOTE_MIN_LENGTH_WHEN_OTHER} ký tự).`;
  }
  return errors;
}

export interface StatusRequestBody {
  targetStatus: RequisitionStatus;
  reasonCode: string;
  note?: string;
  acknowledgePipelineWarning?: boolean;
}

export function buildRequestBody(action: DialogAction, form: FormState, acknowledge: boolean): StatusRequestBody {
  const note = form.note.trim();
  return {
    targetStatus: ACTIONS[action].targetStatus,
    reasonCode: form.reasonCode,
    ...(note ? { note } : {}),
    ...(acknowledge ? { acknowledgePipelineWarning: true } : {}),
  };
}

const STAGE_LABELS: Record<ActivePipelineStage, string> = {
  NEW: 'Hồ sơ mới',
  SCREENING: 'Sàng lọc',
  INTERVIEW: 'Phỏng vấn',
  OFFER: 'Đề xuất offer',
};

export interface PipelineWarningView {
  total: number;
  lines: string[];
}

export function describePipelineWarning(details: unknown): PipelineWarningView {
  const d = (details ?? {}) as { total?: unknown; byStage?: Record<string, unknown> };
  const total = typeof d.total === 'number' ? d.total : 0;
  const lines = (Object.keys(STAGE_LABELS) as ActivePipelineStage[])
    .map((stage) => ({ stage, n: d.byStage?.[stage] }))
    .filter((x): x is { stage: ActivePipelineStage; n: number } => typeof x.n === 'number' && x.n > 0)
    .map((x) => `${STAGE_LABELS[x.stage]}: ${x.n} ứng viên`);
  return { total, lines };
}

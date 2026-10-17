import { DomainError } from '../domain/errors.ts';
import { validateReason } from '../domain/reasons.ts';
import { assertTransition, canHavePublishedPosting } from '../domain/stateMachine.ts';
import type {
  Actor,
  PipelineSummary,
  Requisition,
  RequisitionStatus,
  StatusHistoryEntry,
} from '../domain/types.ts';
import { STATUS_LABELS_VI } from '../domain/types.ts';
import type {
  CandidatePipelineReader,
  Clock,
  JobPostingGateway,
  RequisitionRepository,
  StatusHistoryRepository,
  UnitOfWork,
} from '../ports.ts';

/** Trạng thái mà API này cho phép đặt (APPROVED chỉ hợp lệ khi tiếp tục từ PAUSED). */
export const LIFECYCLE_TARGETS: readonly RequisitionStatus[] = ['PAUSED', 'FILLED', 'CANCELLED', 'APPROVED'];
/** Đóng/huỷ: phải cảnh báo nếu còn ứng viên trong pipeline (AC3). */
const CLOSING_TARGETS: readonly RequisitionStatus[] = ['FILLED', 'CANCELLED'];

export interface ChangeStatusCommand {
  requisitionId: string;
  targetStatus: RequisitionStatus;
  reasonCode?: string;
  note?: string;
  /** Người dùng đã thấy cảnh báo pipeline và xác nhận tiếp tục. */
  acknowledgePipelineWarning?: boolean;
}

export interface ChangeStatusResult {
  requisition: Requisition;
  history: StatusHistoryEntry;
  unpublishedPostingIds: string[];
}

export interface LifecycleDeps {
  uow: UnitOfWork;
  requisitions: RequisitionRepository;
  postings: JobPostingGateway;
  pipeline: CandidatePipelineReader;
  history: StatusHistoryRepository;
  clock: Clock;
}

/** Quyền kiểm ở TẦNG SERVER (DoD): chỉ Trưởng phòng Nhân sự. */
function assertCanManage(actor: Actor): void {
  if (actor.role !== 'HR_MANAGER') {
    throw new DomainError('FORBIDDEN', 'Chỉ Trưởng phòng Nhân sự được thay đổi trạng thái yêu cầu tuyển dụng.');
  }
}

function pipelineWarning(summary: PipelineSummary): DomainError {
  return new DomainError(
    'PIPELINE_WARNING',
    `Còn ${summary.total} ứng viên đang trong pipeline. Hãy xử lý hoặc xác nhận tiếp tục.`,
    { total: summary.total, byStage: summary.byStage },
  );
}

export class RequisitionLifecycleService {
  private readonly deps: LifecycleDeps;

  constructor(deps: LifecycleDeps) {
    this.deps = deps;
  }

  async changeStatus(actor: Actor, cmd: ChangeStatusCommand): Promise<ChangeStatusResult> {
    assertCanManage(actor);
    const { uow, requisitions, postings, pipeline, history, clock } = this.deps;

    return uow.run(async () => {
      const current = await requisitions.findById(cmd.requisitionId);
      if (!current) throw new DomainError('NOT_FOUND', 'Không tìm thấy yêu cầu tuyển dụng.');

      const from = current.status;
      const to = cmd.targetStatus;

      // 1. State machine hợp lệ (Technical Note 1)
      if (!LIFECYCLE_TARGETS.includes(to) || (to === 'APPROVED' && from !== 'PAUSED')) {
        throw new DomainError(
          'INVALID_TRANSITION',
          `Không thể chuyển yêu cầu từ "${STATUS_LABELS_VI[from]}" sang "${STATUS_LABELS_VI[to]}".`,
          { from, to },
        );
      }
      assertTransition(from, to);

      // 2. Lý do tương ứng từng trạng thái (AC1)
      const reason = validateReason(to, cmd.reasonCode, cmd.note);

      // 3. Cảnh báo pipeline trước khi đóng/huỷ (AC3)
      let pipelineAcknowledged = 0;
      if (CLOSING_TARGETS.includes(to)) {
        const summary = await pipeline.countActiveByStage(current.id);
        if (summary.total > 0) {
          if (!cmd.acknowledgePipelineWarning) throw pipelineWarning(summary);
          pipelineAcknowledged = summary.total;
        }
      }

      // 4. Gỡ tin trong CÙNG giao dịch (AC2 + Technical Note 2)
      const unpublishedPostingIds: string[] = [];
      if (!canHavePublishedPosting(to)) {
        const live = await postings.findPublishedByRequisition(current.id);
        for (const posting of live) {
          try {
            await postings.unpublish(posting.id, `REQUISITION_${to}`);
          } catch (cause) {
            throw new DomainError('UNPUBLISH_FAILED', 'Không gỡ được tin tuyển dụng; thao tác đã được hoàn tác.', {
              postingId: posting.id,
              cause: cause instanceof Error ? cause.message : String(cause),
            });
          }
          unpublishedPostingIds.push(posting.id);
        }
      }

      // 5. Ghi trạng thái + người thao tác + thời điểm (AC4)
      const now = clock.now();
      const updated: Requisition = {
        ...current,
        status: to,
        statusReasonCode: reason?.code ?? null,
        statusNote: reason?.note ?? null,
        statusChangedBy: actor.id,
        statusChangedAt: now,
        version: current.version + 1,
      };
      await requisitions.save(updated, current.version);

      const entry = await history.append({
        requisitionId: current.id,
        fromStatus: from,
        toStatus: to,
        reasonCode: reason?.code ?? null,
        note: reason?.note ?? null,
        actorId: actor.id,
        actorRole: actor.role,
        occurredAt: now,
        unpublishedPostingIds,
        pipelineAcknowledged,
      });

      return { requisition: updated, history: entry, unpublishedPostingIds };
    });
  }

  async getHistory(actor: Actor, requisitionId: string): Promise<StatusHistoryEntry[]> {
    assertCanManage(actor);
    const found = await this.deps.requisitions.findById(requisitionId);
    if (!found) throw new DomainError('NOT_FOUND', 'Không tìm thấy yêu cầu tuyển dụng.');
    return this.deps.history.listByRequisition(requisitionId);
  }

  /**
   * Lưới an toàn nhất quán: gỡ mọi tin còn "đang đăng" nhưng yêu cầu đã Tạm dừng/Đã tuyển đủ/Huỷ
   * (ví dụ do dữ liệu cũ hoặc lỗi hạ tầng). Chạy định kỳ bằng scheduler (system job).
   */
  async reconcilePostings(): Promise<string[]> {
    const { requisitions, postings } = this.deps;
    const stale = await requisitions.findByStatuses(['PAUSED', 'FILLED', 'CANCELLED']);
    const fixed: string[] = [];
    for (const req of stale) {
      for (const posting of await postings.findPublishedByRequisition(req.id)) {
        await postings.unpublish(posting.id, `RECONCILE_${req.status}`);
        fixed.push(posting.id);
      }
    }
    return fixed;
  }
}

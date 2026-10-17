import { FixedClock, InMemoryStore } from '../src/adapters/inMemory.ts';
import { RequisitionStatusController } from '../src/http/controller.ts';
import { RequisitionLifecycleService } from '../src/service/requisitionLifecycleService.ts';

const store = new InMemoryStore();
const clock = new FixedClock('2026-10-09T03:00:00.000Z');
const service = new RequisitionLifecycleService({ uow: store, requisitions: store, postings: store, pipeline: store, history: store, clock });
const api = new RequisitionStatusController(service);
const HR = { id: 'hr-01', role: 'HR_MANAGER' as const };

store.seedRequisition({ id: 'R1', code: 'REQ-0001', title: 'Backend Developer', status: 'APPROVED' });
store.seedPosting({ id: 'P1', requisitionId: 'R1', status: 'PUBLISHED' });
store.seedPipeline('R1', { SCREENING: 3, INTERVIEW: 2 });

let step = 0;
async function call(title: string, actor: typeof HR | { id: string; role: 'RECRUITER' }, body: unknown) {
  const r = await api.changeStatus({ actor, params: { id: 'R1' }, body });
  const b = r.body as any;
  const info = r.status === 200 ? `trạng thái=${b.requisition.status}, tin đã gỡ=[${b.unpublishedPostingIds}]` : `${b.error.code}: ${b.error.message}`;
  console.log(`${++step}. ${title}\n   -> HTTP ${r.status} | ${info}`);
}
const posting = () => store.postingsById.get('P1')?.status;

console.log('=== DEMO S3-07 (yêu cầu REQ-0001 đang Đã duyệt, 1 tin PUBLISHED, 5 ứng viên trong pipeline) ===\n');
await call('Recruiter thử đóng yêu cầu (phải bị chặn 403)', { id: 'rc-01', role: 'RECRUITER' }, { targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED' });
await call('HR đóng yêu cầu nhưng KHÔNG chọn lý do (422)', HR, { targetStatus: 'FILLED' });
await call('HR đóng yêu cầu khi còn 5 ứng viên (cảnh báo 409)', HR, { targetStatus: 'FILLED', reasonCode: 'HEADCOUNT_REACHED' });
console.log(`   tin đăng vẫn: ${posting()} (chưa bị gỡ vì chưa xác nhận)\n`);
await call('HR tạm dừng (không bị chặn bởi cảnh báo)', HR, { targetStatus: 'PAUSED', reasonCode: 'BUDGET_FREEZE' });
console.log(`   tin đăng: ${posting()}\n`);
await call('HR tiếp tục tuyển (Tạm dừng -> Đã duyệt)', HR, { targetStatus: 'APPROVED' });
await call('HR huỷ, đã xác nhận cảnh báo pipeline', HR, { targetStatus: 'CANCELLED', reasonCode: 'BUDGET_CUT', acknowledgePipelineWarning: true });
await call('HR thử mở lại yêu cầu đã huỷ (state machine chặn 409)', HR, { targetStatus: 'APPROVED' });

console.log('\n=== NHẬT KÝ (người thao tác + thời điểm) ===');
for (const h of store.historyEntries) {
  console.log(`${h.occurredAt} | ${h.actorId} (${h.actorRole}) | ${h.fromStatus} -> ${h.toStatus} | lý do=${h.reasonCode ?? '-'} | tin gỡ=[${h.unpublishedPostingIds}] | ứng viên đã xác nhận=${h.pipelineAcknowledged}`);
}

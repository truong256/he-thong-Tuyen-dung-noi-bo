import type { InMemoryStore } from '../src/adapters/inMemory.ts';

/** Dữ liệu mô phỏng để demo (thay bằng PostgreSQL ở môi trường thật). */
export function seedDemoData(store: InMemoryStore): void {
  store.requisitionsById.clear();
  store.postingsById.clear();
  store.pipelineByReq.clear();
  store.historyEntries = [];

  store.seedRequisition({ id: 'R1', code: 'REQ-2026-001', title: 'Senior Backend Developer (Java/Spring Boot)', status: 'APPROVED' });
  store.seedPosting({ id: 'P1', requisitionId: 'R1', status: 'PUBLISHED' });
  store.seedPipeline('R1', { NEW: 3, SCREENING: 2, INTERVIEW: 2, OFFER: 1 });

  store.seedRequisition({ id: 'R2', code: 'REQ-2026-002', title: 'UI/UX Designer', status: 'APPROVED' });
  store.seedPosting({ id: 'P2', requisitionId: 'R2', status: 'PUBLISHED' });
  store.seedPipeline('R2', {});

  store.seedRequisition({ id: 'R3', code: 'REQ-2026-003', title: 'QA Engineer', status: 'APPROVED' });
  store.seedPosting({ id: 'P3', requisitionId: 'R3', status: 'PUBLISHED' });
  store.seedPipeline('R3', { SCREENING: 1 });

  store.seedRequisition({
    id: 'R4', code: 'REQ-2026-004', title: 'Data Analyst', status: 'PAUSED',
    statusReasonCode: 'BUDGET_FREEZE', statusChangedBy: 'u-hr-01', statusChangedAt: '2026-10-01T02:00:00.000Z', version: 2,
  });
  store.seedPosting({ id: 'P4', requisitionId: 'R4', status: 'UNPUBLISHED' });
  store.seedPipeline('R4', { INTERVIEW: 1 });

  store.seedRequisition({ id: 'R5', code: 'REQ-2026-005', title: 'Kế toán tổng hợp', status: 'PENDING_APPROVAL' });
  store.seedRequisition({ id: 'R6', code: 'REQ-2026-006', title: 'Chuyên viên Marketing', status: 'FILLED', statusReasonCode: 'HEADCOUNT_REACHED', version: 2 });
}

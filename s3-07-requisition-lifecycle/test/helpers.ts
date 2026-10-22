import { FixedClock, InMemoryStore } from '../src/adapters/inMemory.ts';
import { RequisitionStatusController } from '../src/http/controller.ts';
import { RequisitionLifecycleService } from '../src/service/requisitionLifecycleService.ts';
import type { Actor } from '../src/domain/types.ts';

export const HR: Actor = { id: 'u-hr-01', role: 'HR_MANAGER' };
export const RECRUITER: Actor = { id: 'u-rc-01', role: 'RECRUITER' };
export const T0 = '2026-10-09T03:00:00.000Z';

export function setup() {
  const store = new InMemoryStore();
  const clock = new FixedClock(T0);
  const service = new RequisitionLifecycleService({
    uow: store,
    requisitions: store,
    postings: store,
    pipeline: store,
    history: store,
    clock,
  });
  const controller = new RequisitionStatusController(service);
  return { store, clock, service, controller };
}

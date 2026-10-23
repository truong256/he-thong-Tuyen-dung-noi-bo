import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DomainError } from '../src/domain/errors.ts';
import { assertTransition, canHavePublishedPosting, canTransition, isTerminal, TRANSITIONS } from '../src/domain/stateMachine.ts';
import { REQUISITION_STATUSES } from '../src/domain/types.ts';
import { NOTE_MAX_LENGTH, requiresReason, validateReason } from '../src/domain/reasons.ts';

describe('state machine', () => {
  it('cho phép các cạnh S3-07 hợp lệ', () => {
    for (const [from, to] of [
      ['APPROVED', 'PAUSED'], ['APPROVED', 'FILLED'], ['APPROVED', 'CANCELLED'],
      ['PAUSED', 'APPROVED'], ['PAUSED', 'FILLED'], ['PAUSED', 'CANCELLED'],
      ['DRAFT', 'CANCELLED'], ['PENDING_APPROVAL', 'CANCELLED'],
    ] as const) {
      assert.equal(canTransition(from, to), true, `${from} -> ${to}`);
      assert.doesNotThrow(() => assertTransition(from, to));
    }
  });

  it('FILLED và CANCELLED là trạng thái cuối, không đi tiếp được', () => {
    for (const end of ['FILLED', 'CANCELLED'] as const) {
      assert.equal(isTerminal(end), true);
      for (const to of REQUISITION_STATUSES) assert.equal(canTransition(end, to), false);
    }
    assert.equal(isTerminal('APPROVED'), false);
  });

  it('từ chối cạnh không hợp lệ bằng INVALID_TRANSITION', () => {
    assert.throws(
      () => assertTransition('DRAFT', 'FILLED'),
      (e: unknown) => e instanceof DomainError && e.code === 'INVALID_TRANSITION' && e.httpStatus === 409,
    );
  });

  it('không có cạnh tự trỏ về chính nó', () => {
    for (const s of REQUISITION_STATUSES) assert.equal(TRANSITIONS[s].includes(s), false);
  });

  it('chỉ APPROVED được phép có tin đang đăng', () => {
    for (const s of REQUISITION_STATUSES) assert.equal(canHavePublishedPosting(s), s === 'APPROVED');
  });
});

describe('lý do theo trạng thái', () => {
  it('PAUSED/FILLED/CANCELLED bắt buộc lý do; APPROVED (tiếp tục) thì không', () => {
    assert.equal(requiresReason('PAUSED'), true);
    assert.equal(requiresReason('FILLED'), true);
    assert.equal(requiresReason('CANCELLED'), true);
    assert.equal(requiresReason('APPROVED'), false);
    assert.equal(validateReason('APPROVED', undefined, undefined), null);
  });

  it('thiếu lý do -> REASON_REQUIRED', () => {
    assert.throws(() => validateReason('PAUSED', undefined, undefined), { code: 'REASON_REQUIRED' });
  });

  it('lý do của trạng thái khác -> INVALID_REASON', () => {
    assert.throws(() => validateReason('PAUSED', 'DUPLICATE_REQUEST', undefined), { code: 'INVALID_REASON' });
  });

  it('"Lý do khác" bắt buộc ghi chú >= 5 ký tự (sau trim)', () => {
    assert.throws(() => validateReason('CANCELLED', 'OTHER', '  ab  '), { code: 'NOTE_REQUIRED' });
    assert.deepEqual(validateReason('CANCELLED', 'OTHER', '  Đổi chiến lược  '), { code: 'OTHER', note: 'Đổi chiến lược' });
  });

  it('ghi chú quá dài bị từ chối; ghi chú rỗng thành null', () => {
    assert.throws(() => validateReason('FILLED', 'HEADCOUNT_REACHED', 'x'.repeat(NOTE_MAX_LENGTH + 1)), { code: 'VALIDATION_ERROR' });
    assert.deepEqual(validateReason('FILLED', 'HEADCOUNT_REACHED', '   '), { code: 'HEADCOUNT_REACHED', note: null });
    assert.deepEqual(validateReason('FILLED', 'HEADCOUNT_REACHED', undefined), { code: 'HEADCOUNT_REACHED', note: null });
  });
});

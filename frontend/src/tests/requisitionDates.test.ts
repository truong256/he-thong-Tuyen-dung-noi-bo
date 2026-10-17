import { describe, it, expect } from 'vitest';
import { vietnamDay, requisitionTiming } from '../utils/requisitionDates';

describe('requisitionDates utility (PR #32 & S3-08 SLA)', () => {
  it('correctly parses and formats vietnamDay from YYYY-MM-DD string', () => {
    expect(vietnamDay('2026-10-17')).toBe('2026-10-17');
    expect(vietnamDay('2026-02-28')).toBe('2026-02-28');
  });

  it('correctly parses ISO strings with timezone offsets', () => {
    expect(vietnamDay('2026-10-17T10:00:00Z')).toBe('2026-10-17');
    expect(vietnamDay('2026-10-17T17:30:00+07:00')).toBe('2026-10-17');
  });

  it('returns null for empty or invalid values', () => {
    expect(vietnamDay('')).toBeNull();
    expect(vietnamDay('not-a-date')).toBeNull();
    expect(vietnamDay('2026-02-31')).toBeNull();
  });

  it('calculates daysOpen, daysRemaining, overdue, and daysOverdue', () => {
    const fixedNow = new Date('2026-10-20T00:00:00+07:00');

    // Case 1: Active requisition with future target date
    const res1 = requisitionTiming('2026-10-10', '2026-10-25', 'APPROVED', fixedNow);
    expect(res1.daysOpen).toBe(10);
    expect(res1.daysRemaining).toBe(5);
    expect(res1.overdue).toBe(false);
    expect(res1.daysOverdue).toBe(0);

    // Case 2: Active requisition overdue
    const res2 = requisitionTiming('2026-10-01', '2026-10-15', 'APPROVED', fixedNow);
    expect(res2.daysRemaining).toBe(-5);
    expect(res2.overdue).toBe(true);
    expect(res2.daysOverdue).toBe(5);

    // Case 3: Inactive status (CLOSED, CANCELLED, DRAFT) does not flag overdue
    const res3 = requisitionTiming('2026-10-01', '2026-10-15', 'CLOSED', fixedNow);
    expect(res3.overdue).toBe(false);
    expect(res3.daysOverdue).toBe(0);

    const res4 = requisitionTiming('2026-10-01', '2026-10-15', 'CANCELLED', fixedNow);
    expect(res4.overdue).toBe(false);
    expect(res4.daysOverdue).toBe(0);
  });
});

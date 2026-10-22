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

    // Case 3: Inactive status (CLOSED, CANCELLED) does not flag overdue
    const res3 = requisitionTiming('2026-10-01', '2026-10-15', 'CLOSED', fixedNow);
    expect(res3.overdue).toBe(false);
    expect(res3.daysOverdue).toBe(0);

    const res4 = requisitionTiming('2026-10-01', '2026-10-15', 'CANCELLED', fixedNow);
    expect(res4.overdue).toBe(false);
    expect(res4.daysOverdue).toBe(0);
  });

  // TC 01: Yêu cầu còn 29 ngày -> Hiển thị "Còn 29 ngày"
  it('TC01: Requisition with 29 days remaining displays "Còn 29 ngày"', () => {
    const fixedNow = new Date('2026-10-18T10:00:00+07:00');
    const res = requisitionTiming('2026-10-01', '2026-11-16', 'APPROVED', fixedNow);
    expect(res.daysRemaining).toBe(29);
    expect(res.remainingLabel).toBe('Còn 29 ngày');
    expect(res.slaStatus).toBe('SAFE');
  });

  // TC 02: Yêu cầu đến hạn hôm nay -> Hiển thị "Hạn hôm nay"
  it('TC02: Requisition due today displays "Hạn hôm nay"', () => {
    const fixedNow = new Date('2026-10-18T14:30:00+07:00');
    const res = requisitionTiming('2026-10-01', '2026-10-18', 'APPROVED', fixedNow);
    expect(res.daysRemaining).toBe(0);
    expect(res.remainingLabel).toBe('Hạn hôm nay');
    expect(res.slaStatus).toBe('WARNING');
    expect(res.overdue).toBe(false);
  });

  // TC 03: Yêu cầu quá hạn 5 ngày -> Hiển thị "Quá hạn 5 ngày"
  it('TC03: Overdue active requisition displays "Quá hạn 5 ngày" and flags overdue', () => {
    const fixedNow = new Date('2026-10-18T09:00:00+07:00');
    const res = requisitionTiming('2026-09-15', '2026-10-13', 'APPROVED', fixedNow);
    expect(res.daysRemaining).toBe(-5);
    expect(res.daysOverdue).toBe(5);
    expect(res.remainingLabel).toBe('Quá hạn 5 ngày');
    expect(res.overdue).toBe(true);
    expect(res.slaStatus).toBe('OVERDUE');
  });

  // TC 04: Yêu cầu DRAFT không hiển thị sai nhãn "Đã kết thúc"
  it('TC04: DRAFT requisition (e.g. REQ-20261018-9392) does NOT display "Đã kết thúc"', () => {
    const fixedNow = new Date('2026-10-18T01:45:00+07:00');
    const res = requisitionTiming('2026-10-18', '2026-11-16', 'DRAFT', fixedNow);
    expect(res.remainingLabel).not.toBe('Đã kết thúc');
    expect(res.remainingLabel).toBe('Còn 29 ngày');
    expect(res.openLabel).toBe('Chưa mở');
    expect(res.daysOpen).toBeNull();
    expect(res.overdue).toBe(false);
  });

  // TC 05: Yêu cầu đã hủy không cảnh báo như yêu cầu đang tuyển
  it('TC05: CANCELLED requisition displays "Đã kết thúc" and does not flag overdue alert', () => {
    const fixedNow = new Date('2026-10-18T10:00:00+07:00');
    // Target date in past, but status CANCELLED
    const res = requisitionTiming('2026-09-01', '2026-10-01', 'CANCELLED', fixedNow);
    expect(res.overdue).toBe(false);
    expect(res.remainingLabel).toBe('Đã kết thúc');
    expect(res.slaStatus).toBe('INACTIVE');
  });

  // TC 11: Ngày cuối tháng, cuối năm không tính sai
  it('TC11: Month-end and year-end transitions calculate day differences exactly', () => {
    const monthEndNow = new Date('2026-10-31T23:59:59+07:00');
    const monthEndRes = requisitionTiming('2026-10-31', '2026-11-01', 'APPROVED', monthEndNow);
    expect(monthEndRes.daysRemaining).toBe(1);
    expect(monthEndRes.remainingLabel).toBe('Còn 1 ngày');

    const yearEndNow = new Date('2026-12-31T12:00:00+07:00');
    const yearEndRes = requisitionTiming('2026-12-31', '2027-01-01', 'APPROVED', yearEndNow);
    expect(yearEndRes.daysRemaining).toBe(1);
    expect(yearEndRes.remainingLabel).toBe('Còn 1 ngày');

    // Leap year transition (2024-02-28 to 2024-03-01 is 2 days)
    const leapNow = new Date('2024-02-28T08:00:00+07:00');
    const leapRes = requisitionTiming('2024-02-28', '2024-03-01', 'APPROVED', leapNow);
    expect(leapRes.daysRemaining).toBe(2);
  });
});


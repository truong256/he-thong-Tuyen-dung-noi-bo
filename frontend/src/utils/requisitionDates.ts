const DAY_MS = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar day in Vietnam (Asia/Ho_Chi_Minh). Format YYYY-MM-DD. */
export function vietnamDay(value: string | Date | undefined | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number);
      const test = new Date(Date.UTC(y, m - 1, d));
      return test.getUTCFullYear() === y && test.getUTCMonth() === m - 1 && test.getUTCDate() === d ? raw : null;
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(raw) || !vietnamDay(raw.slice(0, 10))) return null;
    value = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}+07:00`);
  }
  if (!Number.isFinite(value.getTime())) return null;
  const parts = dateFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Calculate calendar day difference: aDay - bDay (immune to timezone/DST shifts) */
export function dayDifference(aDay: string, bDay: string): number {
  const [yA, mA, dA] = aDay.split('-').map(Number);
  const [yB, mB, dB] = bDay.split('-').map(Number);
  return Math.round((Date.UTC(yA, mA - 1, dA) - Date.UTC(yB, mB - 1, dB)) / DAY_MS);
}

export type SlaStatus = 'OVERDUE' | 'WARNING' | 'SAFE' | 'INACTIVE' | 'NO_DEADLINE';

export interface RequisitionTimingResult {
  daysOpen: number | null;
  daysRemaining: number | null;
  overdue: boolean;
  daysOverdue: number;
  openLabel: string;
  remainingLabel: string;
  slaStatus: SlaStatus;
}

export function requisitionTiming(
  createdAt: string | undefined,
  targetDate: string | undefined,
  status: string,
  now = new Date(),
  approvedAt?: string
): RequisitionTimingResult {
  const today = vietnamDay(now);
  const created = createdAt ? vietnamDay(createdAt) : null;
  const target = targetDate ? vietnamDay(targetDate) : null;
  const approved = approvedAt ? vietnamDay(approvedAt) : null;

  const normalizedStatus = (status || '').toUpperCase();
  const isInactive = ['CLOSED', 'CANCELLED', 'REJECTED', 'FILLED'].includes(normalizedStatus);
  const isDraft = normalizedStatus === 'DRAFT';
  const isPending = normalizedStatus === 'PENDING_APPROVAL';

  // 1. Số ngày đã mở
  // Theo quy tắc nghiệp vụ: tính từ thời điểm yêu cầu chính thức bắt đầu được mở (approvedAt, hoặc createdAt nếu đã approved)
  // Với yêu cầu chưa mở (DRAFT, PENDING_APPROVAL), hiển thị "Chưa mở", không tạo số ngày giả
  let daysOpen: number | null = null;
  let openLabel = 'Chưa mở';

  if (!isDraft && !isPending && normalizedStatus !== 'REJECTED') {
    const openDay = approved || created;
    if (openDay && today) {
      daysOpen = Math.max(0, dayDifference(today, openDay));
      openLabel = `Đã mở ${daysOpen} ngày`;
    }
  }

  // 2. Số ngày còn lại & SLA status
  let daysRemaining: number | null = null;
  let overdue = false;
  let daysOverdue = 0;
  let remainingLabel = 'Chưa có hạn';
  let slaStatus: SlaStatus = 'NO_DEADLINE';

  if (isInactive) {
    slaStatus = 'INACTIVE';
    remainingLabel = 'Đã kết thúc';
    if (today && target) {
      daysRemaining = dayDifference(target, today);
    }
  } else if (today && target) {
    daysRemaining = dayDifference(target, today);

    if (daysRemaining > 7) {
      slaStatus = 'SAFE';
      remainingLabel = `Còn ${daysRemaining} ngày`;
    } else if (daysRemaining > 0) {
      // Sắp đến hạn: ngưỡng 7 ngày
      slaStatus = 'WARNING';
      remainingLabel = `Còn ${daysRemaining} ngày`;
    } else if (daysRemaining === 0) {
      slaStatus = 'WARNING';
      remainingLabel = 'Hạn hôm nay';
    } else {
      // daysRemaining < 0
      daysOverdue = Math.abs(daysRemaining);
      remainingLabel = `Quá hạn ${daysOverdue} ngày`;
      slaStatus = 'OVERDUE';
      // Đánh dấu overdue khi yêu cầu thuộc trạng thái cần theo dõi tiến độ tuyển dụng (không phải draft)
      if (!isDraft) {
        overdue = true;
      }
    }
  }

  return {
    daysOpen,
    daysRemaining,
    overdue,
    daysOverdue,
    openLabel,
    remainingLabel,
    slaStatus,
  };
}

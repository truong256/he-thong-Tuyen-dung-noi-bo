const DAY_MS = 86_400_000;
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar day in Vietnam. Offset-free API timestamps are Vietnam local time. */
export function vietnamDay(value: string | Date): string | null {
  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const date = new Date(`${raw}T00:00:00Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === raw ? raw : null;
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(raw) || !vietnamDay(raw.slice(0, 10))) return null;
    value = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}+07:00`);
  }
  if (!Number.isFinite(value.getTime())) return null;
  const parts = dateFormatter.formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function requisitionTiming(
  createdAt: string | undefined,
  targetDate: string | undefined,
  status: string,
  now = new Date()
) {
  const today = vietnamDay(now);
  const created = createdAt ? vietnamDay(createdAt) : null;
  const target = targetDate ? vietnamDay(targetDate) : null;
  const difference = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / DAY_MS);
  const daysOpen = today && created ? Math.max(0, difference(today, created)) : null;
  const daysRemaining = today && target ? difference(target, today) : null;
  const inactive = ['DRAFT', 'REJECTED', 'CANCELLED', 'CLOSED', 'COMPLETED', 'FILLED'].includes(status);
  const overdue = !inactive && daysRemaining !== null && daysRemaining < 0;
  const daysOverdue = overdue && daysRemaining !== null ? Math.abs(daysRemaining) : 0;
  return { daysOpen, daysRemaining, overdue, daysOverdue };
}

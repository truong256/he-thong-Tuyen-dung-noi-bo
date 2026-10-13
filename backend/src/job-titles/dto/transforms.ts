import { Transform } from 'class-transformer';

/** Cắt khoảng trắng đầu/cuối cho chuỗi; giữ nguyên các kiểu khác để validator báo lỗi. */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Như Trim nhưng chuỗi rỗng => undefined (dùng cho tham số lọc tuỳ chọn). */
export const TrimToUndefined = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export const Upper = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value));

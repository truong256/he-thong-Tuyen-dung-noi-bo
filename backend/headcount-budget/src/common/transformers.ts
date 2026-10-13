import { ValueTransformer } from 'typeorm';

/** bigint (PostgreSQL trả về string) -> number. VND là số nguyên < 2^53 nên an toàn. */
export const bigintTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | number | null) => (value === null || value === undefined ? value : Number(value)),
};

/** Kiểu cột ngày-giờ khác nhau giữa PostgreSQL (timestamp) và sql.js (datetime) */
export const DATETIME_TYPE = (process.env.DB_TYPE === 'postgres' ? 'timestamp' : 'datetime') as 'datetime';

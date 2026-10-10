import { ErrorCode, badRequest } from '../common/errors';
import { JOB_LEVEL_META, JobLevel } from './job-title.types';

export const collapseSpaces = (value: string): string => value.trim().replace(/\s+/g, ' ');

/** Khoá so sánh tên: không phân biệt hoa/thường và khoảng trắng thừa. */
export const toNameKey = (name: string): string => collapseSpaces(name).toLowerCase();

export const rankOf = (level: JobLevel): number => JOB_LEVEL_META[level].rank;

/** Dải lương hợp lệ: số nguyên VND dương, tối đa >= tối thiểu (bằng nhau = lương cố định). */
export function assertSalaryRange(salaryMin: number, salaryMax: number): void {
  const valid = (n: number): boolean => Number.isSafeInteger(n) && n > 0;
  if (!valid(salaryMin) || !valid(salaryMax)) {
    throw badRequest(
      ErrorCode.SALARY_RANGE_INVALID,
      'Mức lương phải là số nguyên VND lớn hơn 0.',
    );
  }
  if (salaryMax < salaryMin) {
    throw badRequest(
      ErrorCode.SALARY_RANGE_INVALID,
      'Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu.',
    );
  }
}

export type SalaryBandStatus = 'WITHIN' | 'BELOW_MIN' | 'ABOVE_MAX';

export interface SalaryEvaluation {
  status: SalaryBandStatus;
  withinBand: boolean;
}

/**
 * So một mức lương với dải chuẩn. Dùng làm hạn mức duyệt offer ở Sprint 7
 * (S7-04 bắt buộc giải trình khi ngoài dải, S7-05 thêm cấp duyệt khi vượt dải).
 * Kết quả KHÔNG chứa giá trị dải lương nên module gọi không vô tình làm lộ.
 */
export function evaluateAgainstBand(
  salaryMin: number,
  salaryMax: number,
  amount: number,
): SalaryEvaluation {
  if (amount < salaryMin) return { status: 'BELOW_MIN', withinBand: false };
  if (amount > salaryMax) return { status: 'ABOVE_MAX', withinBand: false };
  return { status: 'WITHIN', withinBand: true };
}

/** Escape ký tự đại diện của LIKE để tìm kiếm "50%" hay "a_b" không khớp lung tung. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

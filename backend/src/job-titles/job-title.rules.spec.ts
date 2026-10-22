import {
  assertSalaryRange,
  collapseSpaces,
  escapeLike,
  evaluateAgainstBand,
  rankOf,
  toNameKey,
} from './job-title.rules';
import { JobLevel } from './job-title.types';

describe('job-title.rules', () => {
  describe('assertSalaryRange', () => {
    it('chấp nhận dải hợp lệ và dải lương cố định (min = max)', () => {
      expect(() => assertSalaryRange(10_000_000, 20_000_000)).not.toThrow();
      expect(() => assertSalaryRange(15_000_000, 15_000_000)).not.toThrow();
    });

    it('từ chối max < min', () => {
      expect(() => assertSalaryRange(20_000_000, 10_000_000)).toThrow(/lớn hơn hoặc bằng/);
    });

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('từ chối mức lương không hợp lệ: %s', (bad) => {
      expect(() => assertSalaryRange(bad, 20_000_000)).toThrow(/số nguyên VND/);
      expect(() => assertSalaryRange(10_000_000, bad)).toThrow(/số nguyên VND/);
    });
  });

  describe('evaluateAgainstBand', () => {
    it('phân loại đúng và tính cả hai đầu mút là trong dải', () => {
      expect(evaluateAgainstBand(10, 20, 10)).toEqual({ status: 'WITHIN', withinBand: true });
      expect(evaluateAgainstBand(10, 20, 20)).toEqual({ status: 'WITHIN', withinBand: true });
      expect(evaluateAgainstBand(10, 20, 9)).toEqual({ status: 'BELOW_MIN', withinBand: false });
      expect(evaluateAgainstBand(10, 20, 21)).toEqual({ status: 'ABOVE_MAX', withinBand: false });
    });
  });

  it('chuẩn hoá tên', () => {
    expect(collapseSpaces('  Lập   trình  viên ')).toBe('Lập trình viên');
    expect(toNameKey('  LẬP  trình viên ')).toBe('lập trình viên');
  });

  it('rank tăng dần theo cấp bậc', () => {
    expect(rankOf(JobLevel.INTERN)).toBeLessThan(rankOf(JobLevel.SENIOR));
    expect(rankOf(JobLevel.SENIOR)).toBeLessThan(rankOf(JobLevel.DIRECTOR));
  });

  it('escapeLike thoát %, _ và \\', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});

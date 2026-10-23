import { describe, it, expect } from 'vitest';
import { formatNumberWithCommas, parseNumberFromCommas } from '../utils/numberFormat';

describe('numberFormat utility', () => {
  describe('formatNumberWithCommas', () => {
    it('returns empty string for null, undefined or empty', () => {
      expect(formatNumberWithCommas(null)).toBe('');
      expect(formatNumberWithCommas(undefined)).toBe('');
      expect(formatNumberWithCommas('')).toBe('');
    });

    it('formats numbers with thousand separator commas', () => {
      expect(formatNumberWithCommas('0')).toBe('0');
      expect(formatNumberWithCommas(0)).toBe('0');
      expect(formatNumberWithCommas('1000')).toBe('1,000');
      expect(formatNumberWithCommas(2000000)).toBe('2,000,000');
      expect(formatNumberWithCommas('25000000')).toBe('25,000,000');
      expect(formatNumberWithCommas('123456789')).toBe('123,456,789');
    });

    it('cleans any existing formatting before formatting', () => {
      expect(formatNumberWithCommas('2,000,000')).toBe('2,000,000');
      expect(formatNumberWithCommas('2.000.000 VND')).toBe('2,000,000');
    });
  });

  describe('parseNumberFromCommas', () => {
    it('returns empty string for empty values', () => {
      expect(parseNumberFromCommas('')).toBe('');
      expect(parseNumberFromCommas(null)).toBe('');
      expect(parseNumberFromCommas(undefined)).toBe('');
    });

    it('strips commas and non-digits', () => {
      expect(parseNumberFromCommas('2,000,000')).toBe('2000000');
      expect(parseNumberFromCommas('1,000')).toBe('1000');
      expect(parseNumberFromCommas('0')).toBe('0');
    });
  });
});

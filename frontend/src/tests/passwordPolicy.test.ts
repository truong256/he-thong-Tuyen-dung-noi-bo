import { describe, it, expect } from 'vitest';
import { validatePasswordPolicy, MIN_PASSWORD_LENGTH } from '../utils/passwordPolicy';

describe('Password Policy Verification (S1-04 & S1-03 Consistency)', () => {
  it('enforces minimum length of 8 characters', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);

    const shortPassword = validatePasswordPolicy('Abc12');
    expect(shortPassword.hasMinLength).toBe(false);
    expect(shortPassword.isValid).toBe(false);
  });

  it('rejects passwords containing only numbers even if length >= 8', () => {
    // 12345678 -> FAIL
    const result = validatePasswordPolicy('12345678');
    expect(result.hasMinLength).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasLetter).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.strength.text).toBe('Yếu');
  });

  it('rejects passwords containing only letters even if length >= 8', () => {
    // abcdefgh -> FAIL
    const result = validatePasswordPolicy('abcdefgh');
    expect(result.hasMinLength).toBe(true);
    expect(result.hasLetter).toBe(true);
    expect(result.hasNumber).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.strength.text).toBe('Yếu');
  });

  it('accepts passwords with >= 8 chars containing both letters and numbers', () => {
    // abc12345 -> PASS
    const result = validatePasswordPolicy('abc12345');
    expect(result.hasMinLength).toBe(true);
    expect(result.hasLetter).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.isValid).toBe(true);
    expect(result.strength.percent).toBeGreaterThanOrEqual(70);
  });

  it('correctly calculates strength indicator for empty, medium, and strong passwords', () => {
    const emptyResult = validatePasswordPolicy('');
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.strength.text).toBe('');

    const mediumResult = validatePasswordPolicy('abc12345');
    expect(mediumResult.isValid).toBe(true);
    expect(mediumResult.strength.text).toBe('Trung bình');

    const strongResult = validatePasswordPolicy('P@ssw0rd2026!');
    expect(strongResult.isValid).toBe(true);
    expect(strongResult.strength.text).toBe('Mạnh');
    expect(strongResult.strength.percent).toBe(100);
  });
});

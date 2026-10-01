export interface PasswordValidationResult {
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  isValid: boolean;
  strength: {
    text: 'Yếu' | 'Trung bình' | 'Mạnh' | '';
    color: string;
    percent: number;
  };
}

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates password against Sprint 1 Acceptance Criteria:
 * - Minimum 8 characters
 * - At least 1 letter (a-z, A-Z)
 * - At least 1 number (0-9)
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= MIN_PASSWORD_LENGTH;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isValid = hasMinLength && hasLetter && hasNumber;

  if (!password) {
    return {
      hasMinLength: false,
      hasLetter: false,
      hasNumber: false,
      isValid: false,
      strength: { text: '', color: '', percent: 0 },
    };
  }

  let score = 0;
  if (hasMinLength) score += 30;
  if (password.length >= 10) score += 20;
  if (hasLetter) score += 25;
  if (hasNumber) score += 25;
  if (hasSpecial) score += 15;

  let strength: { text: 'Yếu' | 'Trung bình' | 'Mạnh'; color: string; percent: number };
  if (!isValid || score < 70) {
    strength = { text: 'Yếu', color: '#ef4444', percent: Math.max(25, Math.min(45, score)) };
  } else if (score < 90) {
    strength = { text: 'Trung bình', color: '#f59e0b', percent: 70 };
  } else {
    strength = { text: 'Mạnh', color: '#10b981', percent: 100 };
  }

  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    isValid,
    strength,
  };
}

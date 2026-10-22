/**
 * Utility functions for formatting and handling numeric and currency inputs with thousand separator commas (,).
 */

/**
 * Formats a number or numeric string with commas as thousands separators (e.g. 2000000 -> "2,000,000").
 */
export function formatNumberWithCommas(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Strips non-digit characters from a formatted string (e.g. "2,000,000" -> "2000000").
 */
export function parseNumberFromCommas(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Handles input change for numeric fields formatted with commas, preserving cursor position.
 */
export function handleNumberInputChange(
  event: React.ChangeEvent<HTMLInputElement>,
  onChange: (rawDigits: string) => void
): void {
  const input = event.target;
  const val = input.value;
  const selectionStart = input.selectionStart || 0;

  // Count how many digits are before the cursor in the current input value
  const digitsBefore = val.slice(0, selectionStart).replace(/\D/g, '').length;

  const rawDigits = val.replace(/\D/g, '');
  onChange(rawDigits);

  // Restore cursor position in the formatted string
  requestAnimationFrame(() => {
    if (!input) return;
    const newVal = input.value;
    let targetPos = 0;
    let currentDigits = 0;
    for (let i = 0; i < newVal.length; i++) {
      if (/\d/.test(newVal[i])) {
        currentDigits++;
      }
      targetPos = i + 1;
      if (currentDigits >= digitsBefore) {
        break;
      }
    }
    input.setSelectionRange(targetPos, targetPos);
  });
}

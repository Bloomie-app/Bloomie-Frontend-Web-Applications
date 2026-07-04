/**
 * Medical license numbers in Bloomie follow a fixed shape: two letters, a
 * four-digit year, and a six-digit sequence — e.g. "ML-2024-001234". These
 * helpers auto-insert the separators as the dermatologist types, the same
 * way a date input auto-adds "/".
 */
const LICENSE_NUMBER_GROUPS = [2, 4, 6] as const;

export const LICENSE_NUMBER_PLACEHOLDER = 'ML-2024-001234';

export const LICENSE_NUMBER_MAX_LENGTH =
  LICENSE_NUMBER_GROUPS.reduce((total, group) => total + group, 0) + (LICENSE_NUMBER_GROUPS.length - 1);

export const LICENSE_NUMBER_PATTERN = /^[A-Z]{2}-\d{4}-\d{6}$/;

/**
 * Reformats raw user input into the "AA-0000-000000" license number shape,
 * dropping characters that don't belong in their position (letters in the
 * numeric groups, digits in the letter group) and inserting dashes between
 * groups automatically.
 */
export function formatLicenseNumber(rawValue: string): string {
  const upper = rawValue.toUpperCase();
  let result = '';
  let placed = 0;

  for (const char of upper) {
    if (placed >= LICENSE_NUMBER_GROUPS[0] + LICENSE_NUMBER_GROUPS[1] + LICENSE_NUMBER_GROUPS[2]) break;

    const isLetterGroup = placed < LICENSE_NUMBER_GROUPS[0];
    const isValidChar = isLetterGroup ? /[A-Z]/.test(char) : /[0-9]/.test(char);
    if (!isValidChar) continue;

    result += char;
    placed++;

    const isEndOfGroup =
      placed === LICENSE_NUMBER_GROUPS[0] || placed === LICENSE_NUMBER_GROUPS[0] + LICENSE_NUMBER_GROUPS[1];
    if (isEndOfGroup && placed < LICENSE_NUMBER_GROUPS[0] + LICENSE_NUMBER_GROUPS[1] + LICENSE_NUMBER_GROUPS[2]) {
      result += '-';
    }
  }

  return result;
}

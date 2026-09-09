// Indian number-plate normalization + format validation.
// Standard format: <StateCode 2 letters><District 1-2 digits><Series 1-3 letters><Number 4 digits>
// e.g. WB20AB1234, MH12DE5678. We accept common OCR-noisy variants and normalize
// to a canonical spaced form for display: "WB 20 AB 1234".

const PLATE_REGEX = /^([A-Z]{2})\s*(\d{1,2})\s*([A-Z]{1,3})\s*(\d{4})$/;

export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidIndianPlate(raw: string): boolean {
  const normalized = normalizePlate(raw);
  return PLATE_REGEX.test(normalized);
}

export function formatPlate(raw: string): string {
  const normalized = normalizePlate(raw);
  const match = PLATE_REGEX.exec(normalized);
  if (!match) return normalized;
  const [, state, district, series, num] = match;
  return `${state} ${district} ${series} ${num}`;
}

/** Levenshtein distance, used for fuzzy plate matching when OCR misreads a
 * character (e.g. "0" vs "O", "1" vs "I", "8" vs "B"). */
export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

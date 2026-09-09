// Mirrors apps/api/src/common/plates.ts's normalization rules on the
// frontend so plate input/display stays consistent without a network round
// trip for simple formatting.

export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatPlateDisplay(plate: string): string {
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/.exec(normalizePlate(plate));
  if (!m) return plate;
  return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

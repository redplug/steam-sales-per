export function parseDiscountPercent(text: unknown): number | null {
  if (typeof text !== "string") return null;

  const match = text.match(/-?\s*(\d{1,3})\s*%/);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}

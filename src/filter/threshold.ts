export type ThresholdValidationError =
  | "empty"
  | "not_integer"
  | "below_min"
  | "above_max";

export type ThresholdResult =
  | { ok: true; value: number }
  | { ok: false; error: ThresholdValidationError };

export function normalizeThreshold(input: unknown): ThresholdResult {
  if (typeof input === "number") {
    if (!Number.isInteger(input)) return { ok: false, error: "not_integer" };
    return validateRange(input);
  }

  if (typeof input !== "string") return { ok: false, error: "not_integer" };

  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, error: "empty" };
  if (!/^\d+$/.test(trimmed)) return { ok: false, error: "not_integer" };

  return validateRange(Number(trimmed));
}

function validateRange(value: number): ThresholdResult {
  if (value < 0) return { ok: false, error: "below_min" };
  if (value > 100) return { ok: false, error: "above_max" };
  return { ok: true, value };
}

export function thresholdErrorMessage(error: ThresholdValidationError): string {
  switch (error) {
    case "empty":
      return "Threshold is required. Provide an integer from 0 to 100.";
    case "not_integer":
      return "Threshold must be an integer from 0 to 100.";
    case "below_min":
      return "Threshold cannot be below 0.";
    case "above_max":
      return "Threshold cannot be above 100.";
  }
}

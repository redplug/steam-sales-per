import { describe, expect, it } from "vitest";
import { normalizeThreshold, thresholdErrorMessage } from "../../src/filter/threshold.js";

describe("normalizeThreshold", () => {
  it.each(["0", "1", "75", "100", " 75 ", 75])("accepts %s", (input) => {
    expect(normalizeThreshold(input)).toEqual({ ok: true, value: Number(String(input).trim()) });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["abc", "not_integer"],
    ["75.5", "not_integer"],
    [-1, "below_min"],
    ["101", "above_max"]
  ])("rejects %s", (input, error) => {
    expect(normalizeThreshold(input)).toEqual({ ok: false, error });
  });

  it("returns user-facing messages for validation errors", () => {
    expect(thresholdErrorMessage("above_max")).toContain("above 100");
  });
});

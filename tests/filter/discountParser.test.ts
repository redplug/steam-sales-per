import { describe, expect, it } from "vitest";
import { parseDiscountPercent } from "../../src/filter/discountParser.js";

describe("parseDiscountPercent", () => {
  it.each([
    ["-75%", 75],
    ["75%", 75],
    ["  - 80 % ", 80],
    ["Save -90% today", 90]
  ])("parses %s", (input, expected) => {
    expect(parseDiscountPercent(input)).toBe(expected);
  });

  it.each(["", "no discount", "-101%", "999%", null, undefined])("returns null for %s", (input) => {
    expect(parseDiscountPercent(input)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { extractReviewMetadata } from "../../src/filter/reviewMetadata.js";

describe("extractReviewMetadata", () => {
  it("prefers structure-friendly text and parses count + grade", () => {
    expect(
      extractReviewMetadata("english", ["Very Positive (1,234 user reviews)", "fallback"])
    ).toMatchObject({
      reviewGrade: "very_positive",
      reviewCount: 1234,
      countMissing: false,
      gradeMissing: false
    });
  });

  it("keeps partial metadata visible for diagnostics", () => {
    expect(extractReviewMetadata("english", ["Very Positive"])).toMatchObject({
      reviewGrade: "very_positive",
      reviewCount: null,
      countMissing: true,
      gradeMissing: false
    });
  });
});

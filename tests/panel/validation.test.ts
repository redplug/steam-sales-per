import { describe, expect, it } from "vitest";
import { validateSettingsPayload } from "../../scripts/panel/validation.js";

describe("validateSettingsPayload", () => {
  it("resolves presets into real filter values", () => {
    const result = validateSettingsPayload({ presetId: "deep-sale-hits", language: "english" }, "english");
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.options.minimumDiscountPercent).toBe(75);
    expect(result.options.minimumReviewCount).toBe(500);
    expect(result.presetId).toBe("deep-sale-hits");
  });

  it("rejects invalid review grade values", () => {
    const result = validateSettingsPayload(
      {
        enabled: true,
        language: "english",
        minimumDiscountPercent: 75,
        minimumReviewCount: 500,
        minimumReviewGrade: "great",
        showUnknownDiscount: false,
        showUnknownReviews: false,
        showOwned: false,
        showDlc: false
      },
      "english"
    );
    expect(result).toEqual({ error: "Review grade is not recognized." });
  });
});

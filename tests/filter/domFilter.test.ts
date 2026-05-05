import { readFileSync } from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { applyQualityFilter } from "../../src/filter/domFilter.js";
import type { FilterOptions } from "../../src/filter/filterOptions.js";
import { DEFAULT_FILTER_OPTIONS } from "../../src/filter/filterOptions.js";

function fixture(name: string): Document {
  const html = readFileSync(path.resolve("tests/fixtures", name), "utf8");
  return parseHTML(html).document;
}

function strictOptions(): FilterOptions {
  return {
    ...DEFAULT_FILTER_OPTIONS,
    language: "english",
    minimumDiscountPercent: 75,
    minimumReviewCount: 500,
    minimumReviewGrade: "very_positive",
    showUnknownDiscount: false
  };
}

describe("applyQualityFilter", () => {
  it("applies the quality bar and exposes partial review diagnostics", () => {
    const document = fixture("steam-quality-cards.html");
    const result = applyQualityFilter(document, strictOptions());

    expect(result).toMatchObject({
      status: "applied",
      statusKind: "applied_partial",
      scanned: 6,
      hidden: 3,
      visible: 3,
      unknownDiscount: 0,
      unknownReviews: 1,
      partialMetadata: 1,
      selectorFailures: 0
    });

    const cards = Array.from(document.querySelectorAll(".search_result_row")) as HTMLElement[];
    expect(cards[0].style.display).toBe("none"); // Budget Pick: discount 50% < 75%
    expect(cards[1].style.display).toBe("");      // Hero Candidate: passes all filters
    expect(cards[2].style.display).toBe("none"); // Grade Miss: Mostly Positive < Very Positive
    expect(cards[3].style.display).toBe("none"); // Count Miss: 12 reviews < 500
    expect(cards[4].style.display).toBe("");     // Unknown Reviews: no data → permissive show
    expect(cards[5].style.display).toBe("");     // Partial Metadata: grade passes, count null → show
  });

  it("treats zero results as a successful empty state", () => {
    const document = fixture("steam-quality-cards.html");
    const result = applyQualityFilter(document, {
      ...strictOptions(),
      minimumDiscountPercent: 95
    });

    expect(result.status).toBe("applied");
    expect(result.statusKind).toBe("applied_empty");
    expect(result.visible).toBe(0);
  });

  it("fails visibly when no sale cards are recognized", () => {
    const document = fixture("no-cards.html");
    expect(applyQualityFilter(document, strictOptions())).toMatchObject({
      status: "failed",
      scanned: 0,
      selectorFailures: 1,
      reason: "selector_not_recognized",
      statusKind: "structure_warning"
    });
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { applyDiscountFilter } from "../../src/filter/domFilter.js";

function fixture(name: string): Document {
  const html = readFileSync(path.resolve("tests/fixtures", name), "utf8");
  return parseHTML(html).document;
}

describe("applyDiscountFilter", () => {
  it("hides cards below threshold and keeps equal or above threshold visible", () => {
    const document = fixture("steam-specials.html");
    const result = applyDiscountFilter(document, 75);

    expect(result).toMatchObject({
      status: "applied",
      threshold: 75,
      scanned: 4,
      hidden: 2,
      visible: 2,
      unknown: 1,
      selectorFailures: 0
    });

    const cards = Array.from(document.querySelectorAll(".search_result_row")) as HTMLElement[];
    expect(cards[0].style.display).toBe("none");
    expect(cards[1].style.display).toBe("");
    expect(cards[2].style.display).toBe("");
    expect(cards[3].style.display).toBe("none");
  });

  it("fails visibly when no sale cards are recognized", () => {
    const document = fixture("no-cards.html");
    expect(applyDiscountFilter(document, 75)).toMatchObject({
      status: "failed",
      scanned: 0,
      selectorFailures: 1,
      reason: "selector_not_recognized"
    });
  });
});

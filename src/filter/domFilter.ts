import { parseDiscountPercent } from "./discountParser.js";
import type { FilterOptions } from "./filterOptions.js";
import { decideCardVisibility, type CardMetadata } from "./qualityEngine.js";
import { extractReviewMetadata } from "./reviewMetadata.js";
import { CARD_SELECTORS, DISCOUNT_SELECTORS, REVIEW_HINT_SELECTORS } from "./storeSelectors.js";

export type FilterStatusKind =
  | "applied"
  | "applied_empty"
  | "applied_partial"
  | "structure_warning";

export type FilterDiagnostics = {
  scanned: number;
  hidden: number;
  visible: number;
  hiddenOwned: number;
  hiddenDlc: number;
  unknownDiscount: number;
  unknownReviews: number;
  partialMetadata: number;
  reviewCountMissing: number;
  reviewGradeMissing: number;
  selectorFailures: number;
  elapsedMs: number;
  status: "applied" | "failed";
  statusKind: FilterStatusKind;
  reason?: "selector_not_recognized";
};

export function applyQualityFilter(document: Document, options: FilterOptions): FilterDiagnostics {
  const started = performance.now();
  const cards = findSaleCards(document);

  if (cards.length === 0) {
    return {
      scanned: 0,
      hidden: 0,
      visible: 0,
      hiddenOwned: 0,
      hiddenDlc: 0,
      unknownDiscount: 0,
      unknownReviews: 0,
      partialMetadata: 0,
      reviewCountMissing: 0,
      reviewGradeMissing: 0,
      selectorFailures: 1,
      elapsedMs: elapsed(started),
      status: "failed",
      statusKind: "structure_warning",
      reason: "selector_not_recognized"
    };
  }

  let hidden = 0;
  let visible = 0;
  let hiddenOwned = 0;
  let hiddenDlc = 0;
  let unknownDiscount = 0;
  let unknownReviews = 0;
  let partialMetadata = 0;
  let reviewCountMissing = 0;
  let reviewGradeMissing = 0;

  for (const card of cards) {
    const metadata = extractCardMetadata(card, options);
    if (metadata.discountPercent === null) {
      unknownDiscount += 1;
    }
    if (metadata.reviewCount === null && metadata.reviewGrade === null) {
      unknownReviews += 1;
    } else if (metadata.reviewCount === null || metadata.reviewGrade === null) {
      partialMetadata += 1;
    }
    if (metadata.reviewCount === null) {
      reviewCountMissing += 1;
    }
    if (metadata.reviewGrade === null) {
      reviewGradeMissing += 1;
    }

    const decision = decideCardVisibility(options, metadata);
    if (decision.visible) {
      showCard(card);
      visible += 1;
    } else {
      hideCard(card);
      hidden += 1;
      if (decision.hideReason === "owned_hidden") hiddenOwned += 1;
      if (decision.hideReason === "dlc_hidden") hiddenDlc += 1;
    }
  }

  return {
    scanned: cards.length,
    hidden,
    visible,
    hiddenOwned,
    hiddenDlc,
    unknownDiscount,
    unknownReviews,
    partialMetadata,
    reviewCountMissing,
    reviewGradeMissing,
    selectorFailures: 0,
    elapsedMs: elapsed(started),
    status: "applied",
    statusKind: deriveStatusKind({ visible, partialMetadata, unknownReviews })
  };
}

export function installQualityFilter(document: Document, options: FilterOptions): FilterDiagnostics {
  const diagnostics = applyQualityFilter(document, options);
  const win = document.defaultView;
  if (!win || typeof win.MutationObserver === "undefined") return diagnostics;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new win.MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      applyQualityFilter(document, options);
    }, 300);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return diagnostics;
}

function extractCardMetadata(card: Element, options: FilterOptions): CardMetadata {
  const reviewTexts = collectReviewTexts(card);
  const reviewMetadata = extractReviewMetadata(options.language, reviewTexts);
  return {
    discountPercent: extractDiscount(card),
    reviewCount: reviewMetadata.reviewCount,
    reviewGrade: reviewMetadata.reviewGrade,
    owned: isOwned(card),
    dlc: isDlc(card)
  };
}

function collectReviewTexts(card: Element): string[] {
  const values = new Set<string>();
  for (const selector of REVIEW_HINT_SELECTORS) {
    for (const element of Array.from(card.querySelectorAll(selector))) {
      for (const candidate of [
        element.textContent ?? "",
        element.getAttribute("data-tooltip-text") ?? "",
        element.getAttribute("data-tooltip-html") ?? "",
        element.getAttribute("data-tooltip-content") ?? "",
        element.getAttribute("aria-label") ?? "",
        element.getAttribute("title") ?? ""
      ]) {
        const normalized = candidate.replace(/\s+/g, " ").trim();
        if (normalized) values.add(normalized);
      }
    }
  }

  const fallback = (card.textContent ?? "").replace(/\s+/g, " ").trim();
  if (fallback) values.add(fallback);
  return Array.from(values);
}

function findSaleCards(document: Document): Element[] {
  const seen = new Set<Element>();
  const cards: Element[] = [];

  for (const selector of CARD_SELECTORS) {
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const card = resolveCardRoot(element);
      if (!card || seen.has(card)) continue;
      seen.add(card);
      cards.push(card);
    }
  }

  return cards;
}

function resolveCardRoot(element: Element): Element | null {
  return element.closest(CARD_SELECTORS.join(", "));
}

function extractDiscount(card: Element): number | null {
  for (const selector of DISCOUNT_SELECTORS) {
    for (const element of Array.from(card.querySelectorAll(selector))) {
      const parsed = parseDiscountPercent(element.textContent ?? "");
      if (parsed !== null) return parsed;
    }
  }

  return parseDiscountPercent(card.textContent ?? "");
}

function hideCard(card: Element): void {
  (card as HTMLElement).style.display = "none";
  card.setAttribute("data-steam-sales-per-hidden", "true");
}

function showCard(card: Element): void {
  (card as HTMLElement).style.display = "";
  card.removeAttribute("data-steam-sales-per-hidden");
}

function isOwned(card: Element): boolean {
  const text = (card.textContent ?? "").toLowerCase();
  return Boolean(
    card.querySelector(".ds_owned_flag, .owned, [class*='owned']") ||
      text.includes("in library") ||
      text.includes("already in your steam library") ||
      text.includes("라이브러리에 있음")
  );
}

function isDlc(card: Element): boolean {
  const text = (card.textContent ?? "").toLowerCase();
  const href = (card as HTMLAnchorElement).href?.toLowerCase?.() ?? "";
  return Boolean(
    card.querySelector("[class*='dlc'], [data-ds-dlc], [data-ds-crtrids]") ||
      href.includes("/dlc/") ||
      text.includes("downloadable content") ||
      text.includes("requires the base game") ||
      text.includes("dlc") ||
      text.includes("다운로드 가능 콘텐츠") ||
      text.includes("기본 게임 필요")
  );
}

function deriveStatusKind(input: { visible: number; partialMetadata: number; unknownReviews: number }): FilterStatusKind {
  if (input.visible === 0) return "applied_empty";
  if (input.partialMetadata > 0 || input.unknownReviews > 0) return "applied_partial";
  return "applied";
}

function elapsed(started: number): number {
  return Math.round(performance.now() - started);
}

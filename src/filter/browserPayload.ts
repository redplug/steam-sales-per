import type { FilterOptions, FilterPreset, QualityPresetId, ReviewGrade } from "./filterOptions.js";
import { FILTER_PRESETS, REVIEW_GRADE_ORDER } from "./filterOptions.js";
import { CARD_SELECTORS, DISCOUNT_SELECTORS, REVIEW_HINT_SELECTORS } from "./storeSelectors.js";

const REVIEW_GRADE_LABELS: Record<string, Record<ReviewGrade, string[]>> = {
  english: {
    overwhelmingly_positive: ["overwhelmingly positive"],
    very_positive: ["very positive"],
    mostly_positive: ["mostly positive"],
    positive: ["positive"],
    mixed: ["mixed"],
    mostly_negative: ["mostly negative"],
    very_negative: ["very negative"],
    overwhelmingly_negative: ["overwhelmingly negative"]
  },
  koreana: {
    overwhelmingly_positive: ["압도적으로 긍정적"],
    very_positive: ["매우 긍정적"],
    mostly_positive: ["대체로 긍정적"],
    positive: ["긍정적"],
    mixed: ["복합적"],
    mostly_negative: ["대체로 부정적"],
    very_negative: ["매우 부정적"],
    overwhelmingly_negative: ["압도적으로 부정적"]
  },
  japanese: {
    overwhelmingly_positive: ["圧倒的に好評"],
    very_positive: ["非常に好評"],
    mostly_positive: ["ほぼ好評"],
    positive: ["好評"],
    mixed: ["賛否両論"],
    mostly_negative: ["やや不評"],
    very_negative: ["不評"],
    overwhelmingly_negative: ["圧倒的に不評"]
  }
};

const NO_REVIEW_LABELS = {
  english: ["no user reviews", "no reviews"],
  koreana: ["사용자 평가 없음", "평가 없음"],
  japanese: ["ユーザーレビューはありません", "レビューはありません"]
} as const;

export function buildBrowserPayload(options: FilterOptions): string {
  return `(() => {
    const options = ${JSON.stringify(options)};
    const cardSelectors = ${JSON.stringify(CARD_SELECTORS)};
    const discountSelectors = ${JSON.stringify(DISCOUNT_SELECTORS)};
    const reviewHintSelectors = ${JSON.stringify(REVIEW_HINT_SELECTORS)};
    const reviewGradeOrder = ${JSON.stringify(REVIEW_GRADE_ORDER)};
    const reviewGradeLabels = ${JSON.stringify(REVIEW_GRADE_LABELS)};
    const noReviewLabels = ${JSON.stringify(NO_REVIEW_LABELS)};
    const presets = ${JSON.stringify(FILTER_PRESETS as FilterPreset[])};
    const styleId = "steam-sales-per-style";

    function ensureLanguage() {
      if (!options.language || !location.hostname.includes("steampowered.com")) return false;
      const url = new URL(location.href);
      if (url.searchParams.get("l") === options.language) return false;
      url.searchParams.set("l", options.language);
      location.replace(url.toString());
      return true;
    }

    function parseDiscountPercent(text) {
      if (typeof text !== "string") return null;
      const match = text.match(/-?\\s*(\\d{1,3})\\s*%/);
      if (!match) return null;
      const value = Number(match[1]);
      if (!Number.isInteger(value) || value < 0 || value > 100) return null;
      return value;
    }

    function normalizeText(value) {
      return String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
    }

    function parseReviewGrade(language, text) {
      const normalized = normalizeText(text);
      for (const grade of reviewGradeOrder) {
        const labels = reviewGradeLabels[language]?.[grade] || [];
        if (labels.some((label) => normalized.includes(normalizeText(label)))) {
          return grade;
        }
      }
      return null;
    }

    function parseReviewCount(language, text) {
      const normalized = normalizeText(text);
      const explicitMatch = normalized.match(/([\\d,. ]{1,16})\\s*(user reviews|reviews|개의 평가|평가|件のレビュー|レビュー)/i);
      if (explicitMatch) {
        return normalizeInteger(explicitMatch[1]);
      }
      const parenMatch = normalized.match(/\\(([\\d,. ]{1,16})\\)/);
      if (parenMatch) {
        return normalizeInteger(parenMatch[1]);
      }
      if (containsNoReviews(language, text)) return 0;
      return null;
    }

    function normalizeInteger(raw) {
      const digits = String(raw || "").replace(/[^\\d]/g, "");
      if (!digits) return null;
      const value = Number(digits);
      return Number.isSafeInteger(value) ? value : null;
    }

    function containsNoReviews(language, text) {
      const normalized = normalizeText(text);
      return (noReviewLabels[language] || []).some((label) => normalized.includes(normalizeText(label)));
    }

    function collectReviewTexts(card) {
      const values = new Set();
      for (const selector of reviewHintSelectors) {
        for (const element of Array.from(card.querySelectorAll(selector))) {
          for (const candidate of [
            element.textContent || "",
            element.getAttribute("data-tooltip-text") || "",
            element.getAttribute("data-tooltip-html") || "",
            element.getAttribute("data-tooltip-content") || "",
            element.getAttribute("aria-label") || "",
            element.getAttribute("title") || ""
          ]) {
            const normalized = candidate.replace(/\\s+/g, " ").trim();
            if (normalized) values.add(normalized);
          }
        }
      }
      const fallback = (card.textContent || "").replace(/\\s+/g, " ").trim();
      if (fallback) values.add(fallback);
      return Array.from(values);
    }

    function extractReviewMetadata(card) {
      const texts = collectReviewTexts(card);
      let reviewCount = null;
      let reviewGrade = null;
      for (const text of texts) {
        if (reviewGrade === null) reviewGrade = parseReviewGrade(options.language, text);
        if (reviewCount === null) reviewCount = parseReviewCount(options.language, text);
        if (reviewGrade !== null && reviewCount !== null) break;
      }
      const hasNoReviews = texts.some((text) => containsNoReviews(options.language, text));
      if (hasNoReviews) {
        reviewCount = reviewCount ?? 0;
      }
      return { reviewCount, reviewGrade };
    }

    function extractDiscount(card) {
      for (const selector of discountSelectors) {
        for (const element of Array.from(card.querySelectorAll(selector))) {
          const parsed = parseDiscountPercent(element.textContent || "");
          if (parsed !== null) return parsed;
        }
      }
      return parseDiscountPercent(card.textContent || "");
    }

    function isOwned(card) {
      const text = (card.textContent || "").toLowerCase();
      return Boolean(
        card.querySelector(".ds_owned_flag, .owned, [class*='owned']") ||
        text.includes("in library") ||
        text.includes("already in your steam library") ||
        text.includes("라이브러리에 있음")
      );
    }

    function isDlc(card) {
      const text = (card.textContent || "").toLowerCase();
      const href = (card.href || "").toLowerCase();
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

    function classifyReviewState(metadata) {
      const hasCount = metadata.reviewCount !== null;
      const hasGrade = metadata.reviewGrade !== null;
      if (hasCount && hasGrade) return "known";
      if (hasCount || hasGrade) return "partial";
      return "unknown";
    }

    function meetsReviewGradeFloor(grade, minimum) {
      if (grade === null) return false;
      return reviewGradeOrder.indexOf(grade) <= reviewGradeOrder.indexOf(minimum);
    }

    function decide(metadata) {
      const reviewState = classifyReviewState(metadata);
      if (!options.enabled) {
        return { visible: true, reviewState, hideReason: null };
      }
      if (!options.showOwned && metadata.owned) {
        return { visible: false, reviewState, hideReason: "owned_hidden" };
      }
      if (!options.showDlc && metadata.dlc) {
        return { visible: false, reviewState, hideReason: "dlc_hidden" };
      }
      if (metadata.discountPercent === null) {
        return { visible: options.showUnknownDiscount, reviewState, hideReason: options.showUnknownDiscount ? null : "unknown_discount_hidden" };
      }
      if (metadata.discountPercent < options.minimumDiscountPercent) {
        return { visible: false, reviewState, hideReason: "below_discount_floor" };
      }
      if (reviewState !== "known") {
        return { visible: options.showUnknownReviews, reviewState, hideReason: options.showUnknownReviews ? null : "unknown_reviews_hidden" };
      }
      if ((metadata.reviewCount || 0) < options.minimumReviewCount) {
        return { visible: false, reviewState, hideReason: "below_review_count_floor" };
      }
      if (!meetsReviewGradeFloor(metadata.reviewGrade, options.minimumReviewGrade)) {
        return { visible: false, reviewState, hideReason: "below_review_grade_floor" };
      }
      return { visible: true, reviewState, hideReason: null };
    }

    function ensureStyle() {
      if (document.getElementById(styleId)) return;
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = ".steam-sales-per-hidden-card{display:none!important;}";
      document.head.appendChild(style);
    }

    function findSaleCards() {
      const seen = new Set();
      const cards = [];
      for (const selector of cardSelectors) {
        for (const element of Array.from(document.querySelectorAll(selector))) {
          const card = resolveCardRoot(element);
          if (!card || seen.has(card)) continue;
          seen.add(card);
          cards.push(card);
        }
      }
      return cards;
    }

    function resolveCardRoot(element) {
      return element.closest(cardSelectors.join(", "));
    }

    function hideCard(card) {
      card.classList.add("steam-sales-per-hidden-card");
      card.setAttribute("data-steam-sales-per-hidden", "true");
    }

    function showCard(card) {
      card.classList.remove("steam-sales-per-hidden-card");
      card.style.display = "";
      card.removeAttribute("data-steam-sales-per-hidden");
    }

    function deriveStatusKind(visible, partialMetadata, unknownReviews) {
      if (visible === 0) return "applied_empty";
      if (partialMetadata > 0 || unknownReviews > 0) return "applied_partial";
      return "applied";
    }

    function applyQualityFilter() {
      if (ensureLanguage()) {
        return {
          status: "redirecting",
          statusKind: "applied",
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
          selectorFailures: 0,
          elapsedMs: 0
        };
      }

      ensureStyle();
      const started = performance.now();
      const cards = findSaleCards();
      if (cards.length === 0) {
        return {
          status: "failed",
          statusKind: "structure_warning",
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
          elapsedMs: Math.round(performance.now() - started),
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
        const reviewMetadata = extractReviewMetadata(card);
        const metadata = {
          discountPercent: extractDiscount(card),
          reviewCount: reviewMetadata.reviewCount,
          reviewGrade: reviewMetadata.reviewGrade,
          owned: isOwned(card),
          dlc: isDlc(card)
        };

        if (metadata.discountPercent === null) unknownDiscount += 1;
        if (metadata.reviewCount === null && metadata.reviewGrade === null) unknownReviews += 1;
        else if (metadata.reviewCount === null || metadata.reviewGrade === null) partialMetadata += 1;
        if (metadata.reviewCount === null) reviewCountMissing += 1;
        if (metadata.reviewGrade === null) reviewGradeMissing += 1;

        const outcome = decide(metadata);
        if (outcome.visible) {
          showCard(card);
          visible += 1;
        } else {
          hideCard(card);
          hidden += 1;
          if (outcome.hideReason === "owned_hidden") hiddenOwned += 1;
          if (outcome.hideReason === "dlc_hidden") hiddenDlc += 1;
        }
      }

      return {
        status: "applied",
        statusKind: deriveStatusKind(visible, partialMetadata, unknownReviews),
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
        elapsedMs: Math.round(performance.now() - started)
      };
    }

    const diagnostics = applyQualityFilter();
    if (window.__steamSalesPerObserver) {
      window.__steamSalesPerObserver.disconnect();
      window.__steamSalesPerObserver = undefined;
    }
    if (typeof MutationObserver !== "undefined" && document.body) {
      let timer;
      const observer = new MutationObserver(() => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = undefined;
          applyQualityFilter();
        }, 300);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.__steamSalesPerObserver = observer;
    }
    return diagnostics;
  })()`;
}

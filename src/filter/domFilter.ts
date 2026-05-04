import { parseDiscountPercent } from "./discountParser.js";
import type { FilterOptions } from "./filterOptions.js";

export type FilterDiagnostics = {
  threshold: number;
  scanned: number;
  hidden: number;
  visible: number;
  unknown: number;
  owned: number;
  dlc: number;
  selectorFailures: number;
  elapsedMs: number;
  status: "applied" | "failed";
  reason?: "selector_not_recognized";
};

const CARD_SELECTORS = [
  "a.search_result_row",
  ".tab_item",
  ".special_tiny_cap",
  ".dailydeal",
  ".sale_capsule",
  ".store_capsule",
  ".carousel_items > *"
];

const DISCOUNT_SELECTORS = [
  ".discount_pct",
  ".discount_block",
  "[class*='discount']"
];

export function applyDiscountFilter(document: Document, thresholdOrOptions: number | FilterOptions): FilterDiagnostics {
  const options = normalizeOptions(thresholdOrOptions);
  const started = performance.now();
  const cards = findSaleCards(document);

  if (cards.length === 0) {
    return {
      threshold: options.threshold,
      scanned: 0,
      hidden: 0,
      visible: 0,
      unknown: 0,
      owned: 0,
      dlc: 0,
      selectorFailures: 1,
      elapsedMs: elapsed(started),
      status: "failed",
      reason: "selector_not_recognized"
    };
  }

  let hidden = 0;
  let visible = 0;
  let unknown = 0;
  let owned = 0;
  let dlc = 0;

  for (const card of cards) {
    if (!options.enabled) {
      showCard(card);
      visible += 1;
      continue;
    }

    if (!options.showOwned && isOwned(card)) {
      owned += 1;
      hideCard(card);
      hidden += 1;
      continue;
    }

    if (!options.showDlc && isDlc(card)) {
      dlc += 1;
      hideCard(card);
      hidden += 1;
      continue;
    }

    const discount = extractDiscount(card);
    if (discount === null) {
      unknown += 1;
      if (options.showUnknown) {
        showCard(card);
        visible += 1;
      } else {
        hideCard(card);
        hidden += 1;
      }
      continue;
    }

    if (discount < options.threshold) {
      hideCard(card);
      hidden += 1;
    } else {
      showCard(card);
      visible += 1;
    }
  }

  return {
    threshold: options.threshold,
    scanned: cards.length,
    hidden,
    visible,
    unknown,
    owned,
    dlc,
    selectorFailures: 0,
    elapsedMs: elapsed(started),
    status: "applied"
  };
}

export function installDiscountFilter(document: Document, thresholdOrOptions: number | FilterOptions): FilterDiagnostics {
  const options = normalizeOptions(thresholdOrOptions);
  const diagnostics = applyDiscountFilter(document, options);
  const win = document.defaultView;
  if (!win || typeof win.MutationObserver === "undefined") return diagnostics;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new win.MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      applyDiscountFilter(document, options);
    }, 300);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return diagnostics;
}

function normalizeOptions(thresholdOrOptions: number | FilterOptions): FilterOptions {
  if (typeof thresholdOrOptions === "number") {
    return {
      threshold: thresholdOrOptions,
      enabled: true,
      language: "koreana",
      showUnknown: false,
      showOwned: false,
      showDlc: false
    };
  }
  return thresholdOrOptions;
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

function isOwned(card: Element): boolean {
  const text = (card.textContent ?? "").toLowerCase();
  return Boolean(
    card.querySelector(".ds_owned_flag, .owned, [class*='owned']") ||
      text.includes("in library") ||
      text.includes("already in your steam library") ||
      text.includes("라이브러리에 있음") ||
      text.includes("이미 라이브러리에")
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
      text.includes("다운로드 가능한 콘텐츠") ||
      text.includes("기본 게임")
  );
}

function showCard(card: Element): void {
  (card as HTMLElement).style.display = "";
  card.removeAttribute("data-steam-sales-per-hidden");
}

function elapsed(started: number): number {
  return Math.round(performance.now() - started);
}

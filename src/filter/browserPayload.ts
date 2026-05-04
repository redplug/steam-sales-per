import type { FilterOptions } from "./filterOptions.js";

export function buildBrowserPayload(options: FilterOptions): string {
  return `(() => {
    const options = ${JSON.stringify(options)};
    const cardSelectors = [
      "a.search_result_row",
      ".tab_item",
      ".special_tiny_cap",
      ".dailydeal",
      ".sale_capsule",
      ".store_capsule",
      ".carousel_items > *"
    ];
    const discountSelectors = [".discount_pct", ".discount_block", "[class*='discount']"];
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
        text.includes("already in your steam library")
      );
    }

    function isDlc(card) {
      const text = (card.textContent || "").toLowerCase();
      const href = (card.href || "").toLowerCase();
      return Boolean(
        card.querySelector("[class*='dlc'], [data-ds-dlc]") ||
        href.includes("/dlc/") ||
        text.includes("downloadable content") ||
        text.includes("requires the base game") ||
        text.includes("dlc")
      );
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
      return element.closest("a.search_result_row, .tab_item, .special_tiny_cap, .dailydeal, .sale_capsule, .store_capsule, .carousel_items > *");
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

    function applyDiscountFilter() {
      if (ensureLanguage()) {
        return {
          threshold: options.threshold,
          enabled: options.enabled,
          language: options.language,
          showUnknown: options.showUnknown,
          showOwned: options.showOwned,
          showDlc: options.showDlc,
          scanned: 0,
          hidden: 0,
          visible: 0,
          unknown: 0,
          owned: 0,
          dlc: 0,
          selectorFailures: 0,
          elapsedMs: 0,
          status: "redirecting",
          reason: "language_changed"
        };
      }

      ensureStyle();
      const started = performance.now();
      const cards = findSaleCards();
      if (cards.length === 0) {
        return {
          threshold: options.threshold,
          enabled: options.enabled,
          language: options.language,
          showUnknown: options.showUnknown,
          showOwned: options.showOwned,
          showDlc: options.showDlc,
          scanned: 0,
          hidden: 0,
          visible: 0,
          unknown: 0,
          owned: 0,
          dlc: 0,
          selectorFailures: 1,
          elapsedMs: Math.round(performance.now() - started),
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
          visible += 1;
          showCard(card);
          continue;
        }

        if (!options.showOwned && isOwned(card)) {
          owned += 1;
          hidden += 1;
          hideCard(card);
          continue;
        }

        if (!options.showDlc && isDlc(card)) {
          dlc += 1;
          hidden += 1;
          hideCard(card);
          continue;
        }

        const discount = extractDiscount(card);
        if (discount === null) {
          unknown += 1;
          if (options.showUnknown) {
            visible += 1;
            showCard(card);
          } else {
            hidden += 1;
            hideCard(card);
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
        enabled: options.enabled,
        language: options.language,
        showUnknown: options.showUnknown,
        showOwned: options.showOwned,
        showDlc: options.showDlc,
        scanned: cards.length,
        hidden,
        visible,
        unknown,
        owned,
        dlc,
        selectorFailures: 0,
        elapsedMs: Math.round(performance.now() - started),
        status: "applied"
      };
    }

    const diagnostics = applyDiscountFilter();
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
          applyDiscountFilter();
        }, 300);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.__steamSalesPerObserver = observer;
    }
    return diagnostics;
  })()`;
}

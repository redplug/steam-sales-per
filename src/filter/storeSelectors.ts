export const CARD_SELECTORS = [
  "a.search_result_row",
  ".tab_item",
  ".special_tiny_cap",
  ".dailydeal",
  ".sale_capsule",
  ".store_capsule",
  ".carousel_items > *"
] as const;

export const DISCOUNT_SELECTORS = [".discount_pct", ".discount_block", "[class*='discount']"] as const;

export const REVIEW_HINT_SELECTORS = [
  "[data-tooltip-text]",
  "[data-tooltip-html]",
  "[data-tooltip-content]",
  ".search_review_summary",
  ".responsive_reviewdesc",
  ".game_review_summary",
  "[class*='review']",
  "[aria-label*='review']",
  "[title*='review']"
] as const;

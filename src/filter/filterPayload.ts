import { applyQualityFilter, type FilterDiagnostics } from "./domFilter.js";
import type { FilterOptions } from "./filterOptions.js";

declare global {
  interface Window {
    steamSalesPerApply?: (options: FilterOptions) => FilterDiagnostics;
  }
}

export function installPayload(): void {
  window.steamSalesPerApply = (options: FilterOptions) => applyQualityFilter(document, options);
}

installPayload();

import { applyDiscountFilter, type FilterDiagnostics } from "./domFilter.js";

declare global {
  interface Window {
    steamSalesPerApply?: (threshold: number) => FilterDiagnostics;
  }
}

export function installPayload(): void {
  window.steamSalesPerApply = (threshold: number) => applyDiscountFilter(document, threshold);
}

installPayload();

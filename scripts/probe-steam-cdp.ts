import { normalizeThreshold, thresholdErrorMessage } from "../src/filter/threshold.js";
import { probeAndApplyFilter, watchAndApplyFilter, type WatchEvent } from "../src/filter/steamCdp.js";
import { DEFAULT_FILTER_OPTIONS, type FilterOptions, type ReviewGrade } from "../src/filter/filterOptions.js";
import { findSteamExe, launchSteamWithCefDebugging } from "../src/steam/steamLocator.js";

const args = parseArgs(process.argv.slice(2));
const discountResult = normalizeThreshold(args.threshold ?? String(DEFAULT_FILTER_OPTIONS.minimumDiscountPercent));
const port = Number(args.port ?? "8080");
const watch = args.watch === "true";
const noLaunch = args["no-launch"] === "true";
const reviewCount = Number(args["review-count"] ?? String(DEFAULT_FILTER_OPTIONS.minimumReviewCount));
const reviewGrade = (args["review-grade"] as ReviewGrade | undefined) ?? DEFAULT_FILTER_OPTIONS.minimumReviewGrade;

if (!discountResult.ok) {
  printStatus({
    STATUS: "blocked",
    STEAM: "not_checked",
    TARGET: "not_checked",
    FILTER: "not_applied",
    NEXT: thresholdErrorMessage(discountResult.error)
  });
  process.exit(1);
}

const filterOptions: FilterOptions = {
  ...DEFAULT_FILTER_OPTIONS,
  minimumDiscountPercent: discountResult.value,
  minimumReviewCount: Number.isFinite(reviewCount) && reviewCount >= 0 ? reviewCount : DEFAULT_FILTER_OPTIONS.minimumReviewCount,
  minimumReviewGrade: reviewGrade,
  enabled: args.disable === "true" ? false : DEFAULT_FILTER_OPTIONS.enabled,
  showUnknownDiscount: args["show-unknown-discount"] === "true" || DEFAULT_FILTER_OPTIONS.showUnknownDiscount,
  showUnknownReviews: args["show-unknown-reviews"] === "true" || DEFAULT_FILTER_OPTIONS.showUnknownReviews,
  showOwned: args["show-owned"] === "true" || DEFAULT_FILTER_OPTIONS.showOwned,
  showDlc: args["show-dlc"] === "true" || DEFAULT_FILTER_OPTIONS.showDlc
};

if (!noLaunch) {
  const bootResult = await ensureSteamDebugEndpoint(port);
  if (bootResult) {
    printStatus(bootResult);
  }
}

if (watch) {
  console.log(`STATUS: watching`);
  console.log(`STEAM: waiting_for_debug_endpoint`);
  console.log(`TARGET: all_store_targets`);
  console.log(`FILTER: ${formatOptions(filterOptions)}`);
  console.log("NEXT: Keep this terminal open. New Steam Store pages will be filtered automatically.");

  await watchAndApplyFilter(filterOptions, {
    port,
    onEvent: printWatchEvent
  });
}

const result = await probeAndApplyFilter(filterOptions, port);

if (result.status === "debug_endpoint_unavailable") {
  printStatus({
    STATUS: "blocked",
    STEAM: "debug_endpoint_unavailable",
    TARGET: "not_checked",
    FILTER: "not_applied",
    NEXT: result.message
  });
  process.exit(2);
}

if (result.status === "store_target_missing") {
  printStatus({
    STATUS: "blocked",
    STEAM: "debug_endpoint_found",
    TARGET: "store_missing",
    FILTER: "not_applied",
    NEXT: result.message
  });
  process.exit(3);
}

if (result.status === "injection_failed") {
  printStatus({
    STATUS: "failed",
    STEAM: "debug_endpoint_found",
    TARGET: formatTarget(result.target),
    FILTER: "not_applied",
    NEXT: result.message
  });
  process.exit(4);
}

printStatus({
  STATUS: "applied",
  STEAM: "debug_endpoint_found",
  TARGET: formatTarget(result.target),
  FILTER: formatDiagnostics(result.diagnostics),
  NEXT: "Review the Steam Store page. Quality rules, unknown-review handling, and diagnostics were applied together."
});

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--threshold") parsed.threshold = argv[++i];
    else if (arg === "--review-count") parsed["review-count"] = argv[++i];
    else if (arg === "--review-grade") parsed["review-grade"] = argv[++i];
    else if (arg === "--port") parsed.port = argv[++i];
    else if (arg === "--watch") parsed.watch = "true";
    else if (arg === "--show-unknown-discount") parsed["show-unknown-discount"] = "true";
    else if (arg === "--show-unknown-reviews") parsed["show-unknown-reviews"] = "true";
    else if (arg === "--show-owned") parsed["show-owned"] = "true";
    else if (arg === "--show-dlc") parsed["show-dlc"] = "true";
    else if (arg === "--no-launch") parsed["no-launch"] = "true";
    else if (arg === "--disable") parsed.disable = "true";
  }
  return parsed;
}

async function ensureSteamDebugEndpoint(port: number): Promise<Record<string, string> | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`);
    if (response.ok) return null;
  } catch {
    // Try launching Steam below.
  }

  const steamExe = findSteamExe();
  if (!steamExe) {
    return {
      STATUS: "blocked",
      STEAM: "steam_exe_not_found",
      TARGET: "not_checked",
      FILTER: "not_applied",
      NEXT: "Could not find Steam automatically. Start Steam with -cef-enable-debugging or pass --no-launch."
    };
  }

  launchSteamWithCefDebugging(steamExe);
  await sleep(5000);
  return {
    STATUS: "launched",
    STEAM: `launched ${JSON.stringify(steamExe)}`,
    TARGET: "not_checked",
    FILTER: "not_applied",
    NEXT: "Steam was launched with -cef-enable-debugging. Open Store or Specials if it is not already open."
  };
}

function printStatus(lines: Record<string, string>): void {
  for (const [key, value] of Object.entries(lines)) {
    console.log(`${key}: ${value}`);
  }
}

function formatTarget(target: { title: string; url: string } | undefined): string {
  if (!target) return "unknown";
  return `store_found title=${JSON.stringify(target.title)} url=${JSON.stringify(target.url)}`;
}

function formatDiagnostics(diagnostics: unknown): string {
  if (!diagnostics || typeof diagnostics !== "object") return "applied_no_diagnostics";
  const d = diagnostics as Record<string, unknown>;
  return [
    `status_kind=${d.statusKind}`,
    `scanned=${d.scanned}`,
    `hidden=${d.hidden}`,
    `visible=${d.visible}`,
    `unknown_discount=${d.unknownDiscount}`,
    `unknown_reviews=${d.unknownReviews}`,
    `partial_metadata=${d.partialMetadata}`,
    `selector_failures=${d.selectorFailures}`,
    `elapsed_ms=${d.elapsedMs}`
  ].join(" ");
}

function formatOptions(options: FilterOptions): string {
  return [
    `discount=${options.minimumDiscountPercent}`,
    `review_count=${options.minimumReviewCount}`,
    `review_grade=${options.minimumReviewGrade}`,
    `enabled=${options.enabled}`,
    `show_unknown_discount=${options.showUnknownDiscount}`,
    `show_unknown_reviews=${options.showUnknownReviews}`,
    `show_owned=${options.showOwned}`,
    `show_dlc=${options.showDlc}`
  ].join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printWatchEvent(event: WatchEvent): void {
  if (event.status === "blocked") {
    printStatus({
      STATUS: "blocked",
      STEAM: "debug_endpoint_unavailable",
      TARGET: "not_checked",
      FILTER: "not_applied",
      NEXT: event.message
    });
    return;
  }

  if (event.status === "idle") {
    printStatus({
      STATUS: "watching",
      STEAM: "debug_endpoint_found",
      TARGET: "store_missing",
      FILTER: "not_applied",
      NEXT: event.message
    });
    return;
  }

  if (event.status === "failed") {
    printStatus({
      STATUS: "failed",
      STEAM: "debug_endpoint_found",
      TARGET: formatTarget(event.target),
      FILTER: "not_applied",
      NEXT: event.message
    });
    return;
  }

  printStatus({
    STATUS: "applied",
    STEAM: "debug_endpoint_found",
    TARGET: formatTarget(event.target),
    FILTER: formatDiagnostics(event.diagnostics),
    NEXT: "Watcher is still running. Quality filter rules and diagnostics stay in sync."
  });
}

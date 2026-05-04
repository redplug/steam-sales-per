import { normalizeThreshold, thresholdErrorMessage } from "../src/filter/threshold.js";
import { probeAndApplyFilter, watchAndApplyFilter, type WatchEvent } from "../src/filter/steamCdp.js";
import { DEFAULT_FILTER_OPTIONS, type FilterOptions } from "../src/filter/filterOptions.js";
import { findSteamExe, launchSteamWithCefDebugging } from "../src/steam/steamLocator.js";

const args = parseArgs(process.argv.slice(2));
const thresholdResult = normalizeThreshold(args.threshold ?? "75");
const port = Number(args.port ?? "8080");
const watch = args.watch === "true";
const noLaunch = args["no-launch"] === "true";

if (!thresholdResult.ok) {
  printStatus({
    STATUS: "blocked",
    STEAM: "not_checked",
    TARGET: "not_checked",
    FILTER: "not_applied",
    NEXT: thresholdErrorMessage(thresholdResult.error)
  });
  process.exit(1);
}

const filterOptions: FilterOptions = {
  threshold: thresholdResult.value,
  enabled: args.disable === "true" ? false : DEFAULT_FILTER_OPTIONS.enabled,
  language: "koreana",
  showUnknown: args["show-unknown"] === "true" || DEFAULT_FILTER_OPTIONS.showUnknown,
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
  NEXT: "Review the Steam Store page. Unknown/no-discount cards were hidden and counted as unknown."
});

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--threshold") parsed.threshold = argv[++i];
    else if (arg === "--port") parsed.port = argv[++i];
    else if (arg === "--watch") parsed.watch = "true";
    else if (arg === "--show-unknown") parsed["show-unknown"] = "true";
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
    NEXT: "Steam was launched with -cef-enable-debugging. Open Store/Specials if it is not already open."
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
    `threshold=${d.threshold}`,
    `scanned=${d.scanned}`,
    `hidden=${d.hidden}`,
    `visible=${d.visible}`,
    `unknown=${d.unknown}`,
    `owned=${d.owned}`,
    `dlc=${d.dlc}`,
    `selector_failures=${d.selectorFailures}`,
    `elapsed_ms=${d.elapsedMs}`
  ].join(" ");
}

function formatOptions(options: FilterOptions): string {
  return [
    `threshold=${options.threshold}`,
    `enabled=${options.enabled}`,
    `show_unknown=${options.showUnknown}`,
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
    NEXT: "Watcher is still running. Unknown/no-discount cards are hidden too."
  });
}

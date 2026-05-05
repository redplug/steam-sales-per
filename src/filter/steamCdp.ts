import { WebSocket } from "ws";
import { buildBrowserPayload } from "./browserPayload.js";
import {
  DEFAULT_FILTER_OPTIONS,
  createDisabledFilterOptions,
  type FilterLanguage,
  type FilterOptions
} from "./filterOptions.js";

export type CdpTarget = {
  id: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
  type?: string;
};

export type ProbeStatus =
  | "debug_endpoint_unavailable"
  | "store_target_missing"
  | "injection_failed"
  | "filter_applied";

export type ProbeResult = {
  status: ProbeStatus;
  target?: Pick<CdpTarget, "title" | "url">;
  diagnostics?: unknown;
  message: string;
};

export type WatchEvent =
  | { status: "blocked"; message: string }
  | { status: "idle"; message: string }
  | { status: "applied"; target: Pick<CdpTarget, "title" | "url">; diagnostics: unknown }
  | { status: "failed"; target: Pick<CdpTarget, "title" | "url">; message: string };

export async function fetchTargets(port = 8080): Promise<CdpTarget[]> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`CDP target list returned HTTP ${response.status}`);
  return (await response.json()) as CdpTarget[];
}

export function findStoreTarget(targets: CdpTarget[]): CdpTarget | undefined {
  return findStoreTargets(targets)[0];
}

export function findStoreTargets(targets: CdpTarget[]): CdpTarget[] {
  return targets.filter((target) => {
    const url = target.url.toLowerCase();
    const title = target.title.toLowerCase();
    return url.includes("store.steampowered.com") || title.includes("steam store") || title.includes("specials");
  });
}

export async function probeAndApplyFilter(optionsOrDiscount: number | FilterOptions, port = 8080): Promise<ProbeResult> {
  const options = normalizeOptions(optionsOrDiscount);
  let targets: CdpTarget[];
  try {
    targets = await fetchTargets(port);
  } catch {
    return {
      status: "debug_endpoint_unavailable",
      message: `Steam debugging endpoint unavailable on 127.0.0.1:${port}. Restart Steam with -cef-enable-debugging.`
    };
  }

  const target = findStoreTarget(targets);
  if (!target) {
    return {
      status: "store_target_missing",
      message: "No Steam Store target found. Open the Steam Store or Specials page in the official Steam client and retry."
    };
  }

  try {
    const diagnostics = await applyFilterToTarget(target, options);
    return {
      status: "filter_applied",
      target: { title: target.title, url: target.url },
      diagnostics,
      message: "Filter applied to Steam Store target."
    };
  } catch (error) {
    return {
      status: "injection_failed",
      target: { title: target.title, url: target.url },
      message: error instanceof Error ? error.message : "Filter injection failed."
    };
  }
}

export async function clearAllStoreTargets(port = 8080, language: FilterLanguage = "koreana"): Promise<void> {
  let targets: CdpTarget[];
  try {
    targets = await fetchTargets(port);
  } catch {
    return;
  }

  const storeTargets = findStoreTargets(targets);
  await Promise.allSettled(storeTargets.map((target) => applyFilterToTarget(target, createDisabledFilterOptions(language))));
}

export async function applyFilterToTarget(target: CdpTarget, optionsOrDiscount: number | FilterOptions): Promise<unknown> {
  if (!target.webSocketDebuggerUrl) {
    throw new Error("Target has no webSocketDebuggerUrl");
  }
  return sendRuntimeEvaluate(target.webSocketDebuggerUrl, buildBrowserPayload(normalizeOptions(optionsOrDiscount)));
}

export async function watchAndApplyFilter(
  optionsOrDiscount: number | FilterOptions,
  options: {
    port?: number;
    intervalMs?: number;
    onEvent: (event: WatchEvent) => void;
  }
): Promise<never> {
  const port = options.port ?? 8080;
  const intervalMs = options.intervalMs ?? 2000;
  const filterOptions = normalizeOptions(optionsOrDiscount);
  const lastPrintByTarget = new Map<string, string>();

  for (;;) {
    let targets: CdpTarget[];
    try {
      targets = await fetchTargets(port);
    } catch {
      options.onEvent({
        status: "blocked",
        message: `Steam debugging endpoint unavailable on 127.0.0.1:${port}. Restart Steam with -cef-enable-debugging.`
      });
      await sleep(intervalMs);
      continue;
    }

    const storeTargets = findStoreTargets(targets);
    if (storeTargets.length === 0) {
      options.onEvent({
        status: "idle",
        message: "No Steam Store target found. Open Store or Specials in Steam; watcher is still running."
      });
      await sleep(intervalMs);
      continue;
    }

    for (const target of storeTargets) {
      try {
        const diagnostics = await applyFilterToTarget(target, filterOptions);
        const fingerprint = JSON.stringify({ title: target.title, url: target.url, diagnostics });
        if (lastPrintByTarget.get(target.id) !== fingerprint) {
          lastPrintByTarget.set(target.id, fingerprint);
          options.onEvent({
            status: "applied",
            target: { title: target.title, url: target.url },
            diagnostics
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Filter injection failed.";
        const fingerprint = `failed:${message}`;
        if (lastPrintByTarget.get(target.id) !== fingerprint) {
          lastPrintByTarget.set(target.id, fingerprint);
          options.onEvent({
            status: "failed",
            target: { title: target.title, url: target.url },
            message
          });
        }
      }
    }

    await sleep(intervalMs);
  }
}

function normalizeOptions(optionsOrDiscount: number | FilterOptions): FilterOptions {
  if (typeof optionsOrDiscount === "number") {
    return { ...DEFAULT_FILTER_OPTIONS, minimumDiscountPercent: optionsOrDiscount };
  }
  return optionsOrDiscount;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendRuntimeEvaluate(webSocketUrl: string, expression: string): Promise<unknown> {
  const ws = new WebSocket(webSocketUrl);
  let id = 0;

  await new Promise<void>((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  try {
    const response = await send(ws, {
      id: ++id,
      method: "Runtime.evaluate",
      params: {
        expression,
        awaitPromise: true,
        returnByValue: true
      }
    });

    const result = response.result?.result;
    if (result?.subtype === "error" || response.result?.exceptionDetails) {
      throw new Error(result?.description ?? "Runtime.evaluate failed");
    }
    return result?.value;
  } finally {
    ws.close();
  }
}

function send(ws: WebSocket, message: Record<string, unknown>): Promise<any> {
  const id = message.id;
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      const parsed = JSON.parse(raw.toString());
      if (parsed.id !== id) return;
      ws.off("message", onMessage);
      if (parsed.error) reject(new Error(parsed.error.message ?? "CDP command failed"));
      else resolve(parsed);
    };

    ws.on("message", onMessage);
    ws.send(JSON.stringify(message), (error) => {
      if (error) {
        ws.off("message", onMessage);
        reject(error);
      }
    });
  });
}

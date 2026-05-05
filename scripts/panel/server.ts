import http from "node:http";
import { randomBytes } from "node:crypto";
import type { FilterOptions } from "../../src/filter/filterOptions.js";
import type { ProbeResult } from "../../src/filter/steamCdp.js";
import { DEFAULT_FILTER_OPTIONS } from "../../src/filter/filterOptions.js";
import { renderPanelHtml } from "./render.js";
import { validateSettingsPayload } from "./validation.js";
import { buildAppliedViewModel, buildInitialViewModel, buildPendingViewModel, buildRejectedViewModel } from "./view-model.js";
import type { PanelViewModel } from "./model.js";

export type PanelServer = {
  server: http.Server;
  applyCurrent: () => Promise<void>;
  setStartingMessage: (message: string) => void;
  getCurrentOptions: () => FilterOptions;
  setCurrentOptions: (options: FilterOptions) => void;
};

export function createPanelServer(args: {
  applyFilter: (options: FilterOptions) => Promise<ProbeResult>;
  initialOptions?: FilterOptions;
}): PanelServer {
  let currentOptions = args.initialOptions ?? DEFAULT_FILTER_OPTIONS;
  let currentViewModel: PanelViewModel = buildInitialViewModel(currentOptions);
  const sessionToken = randomBytes(16).toString("hex");
  let currentHost = "";

  const server = http.createServer(async (req, res) => {
    if (!req.url) return send(res, 404, "Not found");

    if (req.method === "GET" && req.url === "/") {
      currentHost = req.headers.host ?? currentHost;
      return send(res, 200, renderPanelHtml(currentViewModel, sessionToken), "text/html; charset=utf-8");
    }

    if (!isTrustedRequest(req, sessionToken, currentHost)) {
      return sendJson(res, { ok: false, error: "Untrusted local request." }, 403);
    }

    if (req.method === "GET" && req.url === "/status") {
      return sendJson(res, { ok: true, viewModel: currentViewModel });
    }

    if (req.method === "POST" && req.url === "/settings") {
      const body = await readBody(req);
      const parsed = validateSettingsPayload(JSON.parse(body), currentOptions.language);
      if ("error" in parsed) {
        currentViewModel = buildRejectedViewModel(currentOptions, parsed.error);
        return sendJson(res, { ok: false, status: currentViewModel.statusMessage, viewModel: currentViewModel }, 400);
      }

      currentOptions = parsed.options;
      currentViewModel = buildPendingViewModel(currentOptions);
      const result = await args.applyFilter(currentOptions);
      currentViewModel = buildAppliedViewModel(currentOptions, result);
      return sendJson(res, { ok: true, viewModel: currentViewModel });
    }

    return send(res, 404, "Not found");
  });

  return {
    server,
    async applyCurrent() {
      const result = await args.applyFilter(currentOptions);
      currentViewModel = buildAppliedViewModel(currentOptions, result);
    },
    setStartingMessage(message: string) {
      currentViewModel = {
        ...buildInitialViewModel(currentOptions),
        statusMessage: message
      };
    },
    getCurrentOptions() {
      return currentOptions;
    },
    setCurrentOptions(options: FilterOptions) {
      currentOptions = options;
      currentViewModel = buildInitialViewModel(currentOptions);
    }
  };
}

function isTrustedRequest(req: http.IncomingMessage, token: string, host: string): boolean {
  if (req.headers["x-steam-sales-per-session"] !== token) return false;
  if (host && req.headers.host !== host) return false;

  const origin = req.headers.origin;
  if (req.method === "POST" && origin && host && origin !== `http://${host}`) {
    return false;
  }

  return true;
}

function send(res: http.ServerResponse, status: number, body: string, type = "text/plain; charset=utf-8"): void {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

function sendJson(res: http.ServerResponse, body: unknown, status = 200): void {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8");
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
  });
}

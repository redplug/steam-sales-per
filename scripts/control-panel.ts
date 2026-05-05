import { spawn } from "node:child_process";
import type { FilterOptions } from "../src/filter/filterOptions.js";
import { DEFAULT_FILTER_OPTIONS } from "../src/filter/filterOptions.js";
import { clearAllStoreTargets, probeAndApplyFilter } from "../src/filter/steamCdp.js";
import { findSteamExe, launchSteamWithCefDebugging } from "../src/steam/steamLocator.js";
import { createPanelServer } from "./panel/server.js";

let cleaning = false;

const panel = createPanelServer({
  applyFilter: (options: FilterOptions) => probeAndApplyFilter(options),
  initialOptions: DEFAULT_FILTER_OPTIONS
});

registerCleanupHandlers();
void main();

async function main(): Promise<void> {
  await ensureSteamLaunched();
  const port = await listen(panel.server);
  const url = `http://127.0.0.1:${port}/`;
  openUrl(url);
  console.log(`steam-sales-per control panel: ${url}`);
  console.log("Keep this window open while using Steam. Closing it restores all hidden Steam products.");

  setInterval(() => {
    void panel.applyCurrent();
  }, 2000);
  await panel.applyCurrent();
}

async function ensureSteamLaunched(): Promise<void> {
  const steamExe = findSteamExe();
  if (!steamExe) {
    panel.setStartingMessage("Steam executable not found. Start Steam manually with -cef-enable-debugging.");
    return;
  }

  if (await isSteamDebugEndpointReady()) return;

  launchSteamWithCefDebugging(steamExe);
  panel.setStartingMessage("Launching Steam with CEF debugging...");
  if (await waitForSteamDebugEndpoint()) {
    panel.setStartingMessage("Launched Steam with CEF debugging.");
    return;
  }

  panel.setStartingMessage(
    "Steam debugging is unavailable. Fully exit Steam, then run this app again so it can start Steam with -cef-enable-debugging."
  );
}

async function waitForSteamDebugEndpoint(): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (await isSteamDebugEndpointReady()) return true;
  }
  return false;
}

async function isSteamDebugEndpointReady(): Promise<boolean> {
  try {
    const response = await fetch("http://127.0.0.1:8080/json/list");
    return response.ok;
  } catch {
    return false;
  }
}

async function cleanup(): Promise<void> {
  if (cleaning) return;
  cleaning = true;
  await clearAllStoreTargets(8080, panel.getCurrentOptions().language);
}

function registerCleanupHandlers(): void {
  process.on("SIGINT", () => {
    void cleanup().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void cleanup().finally(() => process.exit(0));
  });
  process.on("beforeExit", () => {
    void cleanup();
  });
}

function listen(server: import("node:http").Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) resolve(address.port);
    });
  });
}

function openUrl(url: string): void {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

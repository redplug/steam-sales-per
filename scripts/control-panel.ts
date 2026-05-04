import http from "node:http";
import { spawn } from "node:child_process";
import { normalizeThreshold } from "../src/filter/threshold.js";
import { DEFAULT_FILTER_OPTIONS, type FilterOptions } from "../src/filter/filterOptions.js";
import { clearAllStoreTargets, probeAndApplyFilter } from "../src/filter/steamCdp.js";
import { findSteamExe, launchSteamWithCefDebugging } from "../src/steam/steamLocator.js";

let currentOptions: FilterOptions = {
  threshold: 75,
  ...DEFAULT_FILTER_OPTIONS
};
let latestStatus = "Starting...";

const UI_TEXT = {
  koreana: {
    title: "Steam 할인율 필터",
    language: "언어",
    enable: "필터 사용",
    threshold: "최소 할인율",
    showUnknown: "할인율 없는 제품 보이기",
    showOwned: "이미 구매한 제품 보이기",
    showDlc: "DLC 제품 보이기",
    loading: "불러오는 중...",
    active: "필터 적용 중",
    disabled: "필터 꺼짐. 모든 제품이 표시됩니다.",
    applying: "필터 적용 중...",
    restoring: "필터 꺼짐. 모든 제품을 다시 표시합니다.",
    invalidThreshold: "할인율은 0부터 100 사이로 입력해주세요."
  },
  english: {
    title: "Steam Sale Percent Filter",
    language: "Language",
    enable: "Enable filter",
    threshold: "Minimum discount percent",
    showUnknown: "Show products without discount percent",
    showOwned: "Show already owned products",
    showDlc: "Show DLC products",
    loading: "Loading...",
    active: "Filter active",
    disabled: "Filter disabled. All products are visible.",
    applying: "Applying filter...",
    restoring: "Filter disabled. Restoring all products...",
    invalidThreshold: "Enter a discount percent from 0 to 100."
  },
  japanese: {
    title: "Steam 割引率フィルター",
    language: "言語",
    enable: "フィルターを有効化",
    threshold: "最小割引率",
    showUnknown: "割引率のない製品を表示",
    showOwned: "購入済み製品を表示",
    showDlc: "DLC 製品を表示",
    loading: "読み込み中...",
    active: "フィルター適用中",
    disabled: "フィルター無効。すべての製品を表示中。",
    applying: "フィルターを適用中...",
    restoring: "フィルター無効。すべての製品を再表示中。",
    invalidThreshold: "割引率は 0 から 100 の間で入力してください。"
  }
} as const;
let cleaning = false;

const server = http.createServer(async (req, res) => {
  if (!req.url) return send(res, 404, "Not found");

  if (req.method === "GET" && req.url === "/") {
    return send(res, 200, renderHtml(), "text/html; charset=utf-8");
  }

  if (req.method === "GET" && req.url === "/status") {
    return sendJson(res, { status: latestStatus, options: currentOptions });
  }

  if (req.method === "POST" && req.url === "/settings") {
    const body = await readBody(req);
    const next = JSON.parse(body) as Partial<FilterOptions>;
    const threshold = normalizeThreshold(String(next.threshold ?? currentOptions.threshold));
    if (!threshold.ok) {
      return sendJson(res, { ok: false, error: threshold.error, status: t().invalidThreshold }, 400);
    }

    currentOptions = {
      threshold: threshold.value,
      enabled: next.enabled !== false,
      language: isLanguage(next.language) ? next.language : currentOptions.language,
      showUnknown: Boolean(next.showUnknown),
      showOwned: Boolean(next.showOwned),
      showDlc: Boolean(next.showDlc)
    };
    latestStatus = currentOptions.enabled ? t().applying : t().restoring;
    await applyOnce();
    return sendJson(res, { ok: true, options: currentOptions, status: latestStatus });
  }

  return send(res, 404, "Not found");
});

registerCleanupHandlers();
void main();

async function main(): Promise<void> {
  await ensureSteamLaunched();
  const port = await listen(server);
  const url = `http://127.0.0.1:${port}/`;
  openUrl(url);
  console.log(`steam-sales-per control panel: ${url}`);
  console.log("Keep this window open while using Steam. Closing it restores all hidden Steam products.");

  setInterval(() => {
    void applyOnce();
  }, 2000);
  void applyOnce();
}

async function applyOnce(): Promise<void> {
  const result = await probeAndApplyFilter(currentOptions);
  if (result.status === "filter_applied") {
    latestStatus = currentOptions.enabled ? t().active : t().disabled;
    return;
  }
  latestStatus = `${result.status}: ${result.message}`;
}

async function ensureSteamLaunched(): Promise<void> {
  const steamExe = findSteamExe();
  if (!steamExe) {
    latestStatus = "Steam executable not found. Start Steam manually with -cef-enable-debugging.";
    return;
  }

  if (await isSteamDebugEndpointReady()) return;

  launchSteamWithCefDebugging(steamExe);
  latestStatus = "Launching Steam with CEF debugging...";
  if (await waitForSteamDebugEndpoint()) {
    latestStatus = "Launched Steam with CEF debugging.";
    return;
  }

  latestStatus =
    "Steam debugging is unavailable. Fully exit Steam, then run this app again so it can start Steam with -cef-enable-debugging.";
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
  latestStatus = "Restoring Steam Store visibility...";
  await clearAllStoreTargets();
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

function renderHtml(): string {
  const text = t();
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>steam-sales-per</title>
  <style>
    body { margin: 0; font-family: Segoe UI, sans-serif; background: #111; color: #eee; }
    main { max-width: 520px; margin: 40px auto; padding: 24px; border: 1px solid #333; background: #181818; }
    h1 { margin: 0 0 20px; font-size: 22px; }
    label { display: block; margin: 14px 0; }
    input[type="number"], select { width: 160px; padding: 8px; background: #222; color: #fff; border: 1px solid #555; }
    input[type="number"] { width: 96px; }
    input[type="checkbox"] { transform: scale(1.2); margin-right: 8px; }
    #status { margin-top: 18px; color: #9fd5ff; }
  </style>
</head>
<body>
  <main>
    <h1 data-i18n="title">${text.title}</h1>
    <label><span data-i18n="language">${text.language}</span><br>
      <select id="language">
        <option value="koreana" ${currentOptions.language === "koreana" ? "selected" : ""}>한국어</option>
        <option value="english" ${currentOptions.language === "english" ? "selected" : ""}>English</option>
        <option value="japanese" ${currentOptions.language === "japanese" ? "selected" : ""}>日本語</option>
      </select>
    </label>
    <label><input id="enabled" type="checkbox" ${currentOptions.enabled ? "checked" : ""} /><span data-i18n="enable">${text.enable}</span></label>
    <label><span data-i18n="threshold">${text.threshold}</span><br><input id="threshold" type="number" min="0" max="100" value="${currentOptions.threshold}" /></label>
    <label><input id="showUnknown" type="checkbox" ${currentOptions.showUnknown ? "checked" : ""} /><span data-i18n="showUnknown">${text.showUnknown}</span></label>
    <label><input id="showOwned" type="checkbox" ${currentOptions.showOwned ? "checked" : ""} /><span data-i18n="showOwned">${text.showOwned}</span></label>
    <label><input id="showDlc" type="checkbox" ${currentOptions.showDlc ? "checked" : ""} /><span data-i18n="showDlc">${text.showDlc}</span></label>
    <p id="status">${text.loading}</p>
  </main>
  <script>
    const text = ${JSON.stringify(UI_TEXT)};
    const controls = {
      language: document.getElementById('language'),
      enabled: document.getElementById('enabled'),
      threshold: document.getElementById('threshold'),
      showUnknown: document.getElementById('showUnknown'),
      showOwned: document.getElementById('showOwned'),
      showDlc: document.getElementById('showDlc'),
      status: document.getElementById('status')
    };
    let language = ${JSON.stringify(currentOptions.language)};
    let applyTimer;
    let requestId = 0;

    function setLanguage(nextLanguage) {
      language = nextLanguage;
      controls.language.value = nextLanguage;
      const labels = text[language];
      for (const [key, value] of Object.entries(labels)) {
        for (const element of document.querySelectorAll('[data-i18n="' + key + '"]')) {
          element.textContent = value;
        }
      }
      document.documentElement.lang = language === 'koreana' ? 'ko' : language === 'japanese' ? 'ja' : 'en';
    }

    function readPayload() {
      return {
        enabled: controls.enabled.checked,
        threshold: Number(controls.threshold.value),
        language,
        showUnknown: controls.showUnknown.checked,
        showOwned: controls.showOwned.checked,
        showDlc: controls.showDlc.checked
      };
    }

    async function apply() {
      if (controls.threshold.value.trim() === '') {
        controls.status.textContent = text[language].invalidThreshold;
        return;
      }

      const payload = readPayload();
      const id = ++requestId;
      controls.status.textContent = payload.enabled ? text[language].applying : text[language].restoring;
      const res = await fetch('/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (id !== requestId) return;
      controls.status.textContent = json.status || json.error || 'updated';
    }

    function scheduleApply(delay = 250) {
      clearTimeout(applyTimer);
      applyTimer = setTimeout(() => void apply(), delay);
    }

    async function poll() {
      const res = await fetch('/status');
      const json = await res.json();
      controls.status.textContent = json.status;
    }

    controls.language.addEventListener('change', () => {
      setLanguage(controls.language.value);
      void apply();
    });
    controls.threshold.addEventListener('input', () => scheduleApply());
    controls.threshold.addEventListener('change', () => scheduleApply(0));
    for (const element of [controls.enabled, controls.showUnknown, controls.showOwned, controls.showDlc]) {
      element.addEventListener('change', () => void apply());
    }

    setLanguage(language);
    setInterval(poll, 1500);
    poll();
  </script>
</body>
</html>`;
}

function t(): (typeof UI_TEXT)[keyof typeof UI_TEXT] {
  return UI_TEXT[currentOptions.language];
}

function isLanguage(value: unknown): value is FilterOptions["language"] {
  return value === "koreana" || value === "english" || value === "japanese";
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) resolve(address.port);
    });
  });
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

function openUrl(url: string): void {
  spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref();
}

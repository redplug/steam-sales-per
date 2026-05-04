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
    enable: "필터 사용",
    threshold: "최소 할인율",
    showUnknown: "할인율 없는 제품 보이기",
    showOwned: "이미 구매한 제품 보이기",
    showDlc: "DLC 제품 보이기",
    apply: "적용",
    loading: "불러오는 중...",
    active: "필터 적용 중",
    disabled: "필터 꺼짐. 모든 제품이 표시됩니다.",
    applying: "필터 적용 중...",
    restoring: "필터 꺼짐. 모든 제품을 다시 표시합니다."
  },
  english: {
    title: "Steam Sale Percent Filter",
    enable: "Enable filter",
    threshold: "Minimum discount percent",
    showUnknown: "Show products without discount percent",
    showOwned: "Show already owned products",
    showDlc: "Show DLC products",
    apply: "Apply",
    loading: "Loading...",
    active: "Filter active",
    disabled: "Filter disabled. All products are visible.",
    applying: "Applying filter...",
    restoring: "Filter disabled. Restoring all products..."
  },
  japanese: {
    title: "Steam 割引率フィルター",
    enable: "フィルターを有効化",
    threshold: "最小割引率",
    showUnknown: "割引率のない製品を表示",
    showOwned: "購入済み製品を表示",
    showDlc: "DLC 製品を表示",
    apply: "適用",
    loading: "読み込み中...",
    active: "フィルター適用中",
    disabled: "フィルター無効。すべての製品を表示中。",
    applying: "フィルターを適用中...",
    restoring: "フィルター無効。すべての製品を再表示中。"
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
      return sendJson(res, { ok: false, error: threshold.error }, 400);
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

  try {
    const response = await fetch("http://127.0.0.1:8080/json/list");
    if (response.ok) return;
  } catch {
    // Launch below.
  }

  launchSteamWithCefDebugging(steamExe);
  latestStatus = "Launched Steam with CEF debugging.";
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
    input[type="number"] { width: 96px; padding: 8px; background: #222; color: #fff; border: 1px solid #555; }
    input[type="checkbox"] { transform: scale(1.2); margin-right: 8px; }
    button { margin-top: 16px; padding: 10px 14px; background: #66c0f4; border: 0; color: #111; font-weight: 700; cursor: pointer; }
    .language { display: flex; gap: 8px; margin: 0 0 18px; }
    .language button { margin: 0; background: #333; color: #eee; border: 1px solid #555; }
    .language button.active { background: #66c0f4; color: #111; border-color: #66c0f4; }
    #status { margin-top: 18px; color: #9fd5ff; }
  </style>
</head>
<body>
  <main>
    <h1 data-i18n="title">${text.title}</h1>
    <div class="language">
      <button type="button" data-language="koreana" class="${currentOptions.language === "koreana" ? "active" : ""}">한국어</button>
      <button type="button" data-language="english" class="${currentOptions.language === "english" ? "active" : ""}">English</button>
      <button type="button" data-language="japanese" class="${currentOptions.language === "japanese" ? "active" : ""}">日本語</button>
    </div>
    <label><input id="enabled" type="checkbox" ${currentOptions.enabled ? "checked" : ""} /><span data-i18n="enable">${text.enable}</span></label>
    <label><span data-i18n="threshold">${text.threshold}</span><br><input id="threshold" type="number" min="0" max="100" value="${currentOptions.threshold}" /></label>
    <label><input id="showUnknown" type="checkbox" ${currentOptions.showUnknown ? "checked" : ""} /><span data-i18n="showUnknown">${text.showUnknown}</span></label>
    <label><input id="showOwned" type="checkbox" ${currentOptions.showOwned ? "checked" : ""} /><span data-i18n="showOwned">${text.showOwned}</span></label>
    <label><input id="showDlc" type="checkbox" ${currentOptions.showDlc ? "checked" : ""} /><span data-i18n="showDlc">${text.showDlc}</span></label>
    <button id="apply" data-i18n="apply">${text.apply}</button>
    <p id="status">${text.loading}</p>
  </main>
  <script>
    const text = ${JSON.stringify(UI_TEXT)};
    let language = ${JSON.stringify(currentOptions.language)};

    function setLanguage(nextLanguage) {
      language = nextLanguage;
      const labels = text[language];
      for (const [key, value] of Object.entries(labels)) {
        for (const element of document.querySelectorAll('[data-i18n="' + key + '"]')) {
          element.textContent = value;
        }
      }
      for (const button of document.querySelectorAll('[data-language]')) {
        button.classList.toggle('active', button.dataset.language === language);
      }
      document.documentElement.lang = language === 'koreana' ? 'ko' : language === 'japanese' ? 'ja' : 'en';
    }

    async function apply() {
      const payload = {
        enabled: document.getElementById('enabled').checked,
        threshold: Number(document.getElementById('threshold').value),
        language,
        showUnknown: document.getElementById('showUnknown').checked,
        showOwned: document.getElementById('showOwned').checked,
        showDlc: document.getElementById('showDlc').checked
      };
      const res = await fetch('/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      document.getElementById('status').textContent = json.status || json.error || 'updated';
    }
    async function poll() {
      const res = await fetch('/status');
      const json = await res.json();
      document.getElementById('status').textContent = json.status;
    }
    for (const button of document.querySelectorAll('[data-language]')) {
      button.addEventListener('click', async () => {
        setLanguage(button.dataset.language);
        await apply();
      });
    }
    document.getElementById('apply').addEventListener('click', apply);
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

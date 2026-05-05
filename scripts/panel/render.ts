import { FILTER_PRESETS, REVIEW_GRADE_ORDER } from "../../src/filter/filterOptions.js";
import { buildPanelClientScript } from "./client.js";
import { panelCopy, presetLabel, reviewGradeLabel } from "./i18n.js";
import type { PanelViewModel } from "./model.js";

export function renderPanelHtml(viewModel: PanelViewModel, sessionToken: string): string {
  const text = panelCopy(viewModel.options.language);
  const statusTone = viewModel.statusKind;

  return `<!doctype html>
<html lang="${viewModel.options.language === "koreana" ? "ko" : viewModel.options.language === "japanese" ? "ja" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${text.title}</title>
  <style>
    :root {
      --bg: #edf1eb;
      --surface: #f8faf7;
      --surface-strong: #ffffff;
      --line: #cfd7ca;
      --text: #182018;
      --muted: #516054;
      --accent: #2f6a41;
      --success: #285a38;
      --warning: #8b6400;
      --error: #932d2d;
      --focus: #0e5bd8;
      --radius: 14px;
      --pill-radius: 999px;
      --shadow: 0 12px 30px rgba(24, 32, 24, 0.08);
      --font: "Bahnschrift", "Segoe UI Variable", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font);
      background:
        radial-gradient(circle at top right, rgba(47, 106, 65, 0.12), transparent 36%),
        linear-gradient(180deg, #f4f7f2 0%, var(--bg) 100%);
      color: var(--text);
      padding: 24px;
    }
    main {
      width: min(720px, 100%);
      margin: 0 auto;
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: calc(var(--radius) + 4px);
      background: color-mix(in srgb, var(--surface) 88%, white);
      box-shadow: var(--shadow);
    }
    .eyebrow {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 {
      margin: 10px 0 6px;
      font-size: 30px;
      line-height: 1.05;
    }
    .purpose {
      margin: 0 0 20px;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.45;
    }
    .summary-card {
      padding: 18px 18px 16px;
      border-radius: var(--radius);
      background: var(--surface-strong);
      border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line));
    }
    .summary-label {
      margin: 0 0 8px;
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summary {
      margin: 0;
      font-size: 20px;
      line-height: 1.35;
      font-weight: 700;
    }
    .active-preset {
      margin-top: 10px;
      color: var(--muted);
      font-size: 14px;
    }
    section {
      margin-top: 20px;
    }
    .section-label {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .preset-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .preset-button {
      min-height: 44px;
      padding: 10px 14px;
      border-radius: var(--pill-radius);
      border: 1px solid var(--line);
      background: transparent;
      color: var(--text);
      font: inherit;
      cursor: pointer;
    }
    .preset-button[data-active="true"] {
      border-color: color-mix(in srgb, var(--accent) 38%, var(--line));
      background: color-mix(in srgb, var(--accent) 10%, white);
      color: var(--accent);
    }
    .quality-bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: 14px;
      padding: 16px;
      border-radius: var(--radius);
      background: var(--surface-strong);
      border: 1px solid var(--line);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: 14px;
      font-weight: 600;
    }
    input[type="number"], select {
      min-height: 44px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--text);
      font: inherit;
    }
    input:focus, select:focus, button:focus {
      outline: 3px solid color-mix(in srgb, var(--focus) 38%, transparent);
      outline-offset: 2px;
    }
    .secondary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 18px;
      padding: 16px;
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--surface) 72%, white);
      border: 1px solid var(--line);
    }
    .toggle {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-height: 44px;
      color: var(--text);
      font-size: 15px;
      line-height: 1.35;
    }
    .toggle input {
      margin-top: 3px;
      transform: scale(1.15);
    }
    .diagnostics {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
    }
    .status {
      font-size: 15px;
      line-height: 1.45;
      color: var(--success);
    }
    .status[data-kind="applied_partial"],
    .status[data-kind="applied_empty"] {
      color: var(--warning);
    }
    .status[data-kind="settings_rejected"],
    .status[data-kind="structure_warning"],
    .status[data-kind="steam_unavailable"] {
      color: var(--error);
    }
    .empty-hint {
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
    }
    @media (max-width: 640px) {
      body { padding: 14px; }
      main { padding: 18px; }
      .quality-bar {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .quality-bar .field:last-child {
        grid-column: 1 / -1;
      }
      .secondary-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body data-session-token="${sessionToken}" data-active-preset="${viewModel.activePresetId ?? "custom"}" data-ui-language="${viewModel.options.language}">
  <main>
    <p class="eyebrow">Steam inside the Steam client</p>
    <h1>${text.title}</h1>
    <p class="purpose">${text.purpose}</p>

    <section class="summary-card">
      <p class="summary-label">${text.summaryLabel}</p>
      <p id="activeSummary" class="summary">${viewModel.summary}</p>
      <p class="active-preset">${text.presetsLabel}: <strong id="activePreset">${viewModel.activePresetLabel}</strong></p>
    </section>

    <section>
      <p class="section-label">${text.presetsLabel}</p>
      <div class="preset-row">
        ${FILTER_PRESETS.map((preset) => {
          const active = preset.id === viewModel.activePresetId;
          return `<button type="button" class="preset-button" data-preset-id="${preset.id}" data-active="${active ? "true" : "false"}">${presetLabel(viewModel.options.language, preset.id)}</button>`;
        }).join("")}
      </div>
    </section>

    <section>
      <p class="section-label">${text.primaryLabel}</p>
      <div class="quality-bar">
        <div class="field">
          <label for="minimumDiscountPercent">${text.minimumDiscountPercent}</label>
          <input id="minimumDiscountPercent" type="number" min="0" max="100" value="${viewModel.options.minimumDiscountPercent}" />
        </div>
        <div class="field">
          <label for="minimumReviewCount">${text.minimumReviewCount}</label>
          <input id="minimumReviewCount" type="number" min="0" value="${viewModel.options.minimumReviewCount}" />
        </div>
        <div class="field">
          <label for="minimumReviewGrade">${text.minimumReviewGrade}</label>
          <select id="minimumReviewGrade">
            ${REVIEW_GRADE_ORDER.map((grade) => {
              const selected = grade === viewModel.options.minimumReviewGrade ? "selected" : "";
              return `<option value="${grade}" ${selected}>${reviewGradeLabel(viewModel.options.language, grade)}</option>`;
            }).join("")}
          </select>
        </div>
      </div>
    </section>

    <section>
      <p class="section-label">${text.secondaryLabel}</p>
      <div class="secondary-grid">
        <label class="toggle"><input id="enabled" type="checkbox" ${viewModel.options.enabled ? "checked" : ""} /><span>${text.enabled}</span></label>
        <label class="toggle"><input id="showUnknownDiscount" type="checkbox" ${viewModel.options.showUnknownDiscount ? "checked" : ""} /><span>${text.showUnknownDiscount}</span></label>
        <label class="toggle"><input id="showOwned" type="checkbox" ${viewModel.options.showOwned ? "checked" : ""} /><span>${text.showOwned}</span></label>
        <label class="toggle"><input id="showDlc" type="checkbox" ${viewModel.options.showDlc ? "checked" : ""} /><span>${text.showDlc}</span></label>
        <div class="field">
          <label for="language">Language</label>
          <select id="language">
            <option value="koreana" ${viewModel.options.language === "koreana" ? "selected" : ""}>한국어</option>
            <option value="english" ${viewModel.options.language === "english" ? "selected" : ""}>English</option>
            <option value="japanese" ${viewModel.options.language === "japanese" ? "selected" : ""}>日本語</option>
          </select>
        </div>
      </div>
    </section>

    <section class="diagnostics">
      <div
        id="statusText"
        class="status"
        data-kind="${statusTone}"
        data-applying="${text.applying}"
        aria-live="${viewModel.announcementMode}"
      >${viewModel.statusMessage}</div>
      <div id="emptyHint" class="empty-hint" ${viewModel.emptyHint ? "" : "hidden"}>${viewModel.emptyHint ?? ""}</div>
    </section>
  </main>
  <script>${buildPanelClientScript()}</script>
</body>
</html>`;
}

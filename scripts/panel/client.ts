export function buildPanelClientScript(): string {
  return `
(() => {
  const token = document.body.dataset.sessionToken;
  const requestTracker = createRequestTracker();
  const controls = {
    language: document.getElementById("language"),
    enabled: document.getElementById("enabled"),
    minimumDiscountPercent: document.getElementById("minimumDiscountPercent"),
    minimumReviewCount: document.getElementById("minimumReviewCount"),
    minimumReviewGrade: document.getElementById("minimumReviewGrade"),
    showUnknownDiscount: document.getElementById("showUnknownDiscount"),
    showUnknownReviews: document.getElementById("showUnknownReviews"),
    showOwned: document.getElementById("showOwned"),
    showDlc: document.getElementById("showDlc"),
    summary: document.getElementById("activeSummary"),
    status: document.getElementById("statusText"),
    emptyHint: document.getElementById("emptyHint"),
    activePreset: document.getElementById("activePreset")
  };

  let pendingPresetId = null;
  let applyTimer;

  function createRequestTracker() {
    let latest = 0;
    return {
      begin() {
        latest += 1;
        return latest;
      },
      isCurrent(id) {
        return id === latest;
      }
    };
  }

  function readManualPayload() {
    return {
      enabled: controls.enabled.checked,
      language: controls.language.value,
      minimumDiscountPercent: Number(controls.minimumDiscountPercent.value),
      minimumReviewCount: Number(controls.minimumReviewCount.value),
      minimumReviewGrade: controls.minimumReviewGrade.value,
      showUnknownDiscount: controls.showUnknownDiscount.checked,
      showUnknownReviews: controls.showUnknownReviews.checked,
      showOwned: controls.showOwned.checked,
      showDlc: controls.showDlc.checked
    };
  }

  async function postSettings(payload) {
    const requestId = requestTracker.begin();
    controls.status.textContent = controls.status.dataset.applying;
    const response = await fetch("/settings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-steam-sales-per-session": token
      },
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    if (!requestTracker.isCurrent(requestId)) return;
    if (!response.ok) {
      controls.status.textContent = json.status || json.error || "Rejected.";
      return;
    }
    applyViewModel(json.viewModel);
  }

  function applyViewModel(viewModel) {
    controls.language.value = viewModel.options.language;
    controls.enabled.checked = viewModel.options.enabled;
    controls.minimumDiscountPercent.value = viewModel.options.minimumDiscountPercent;
    controls.minimumReviewCount.value = viewModel.options.minimumReviewCount;
    controls.minimumReviewGrade.value = viewModel.options.minimumReviewGrade;
    controls.showUnknownDiscount.checked = viewModel.options.showUnknownDiscount;
    controls.showUnknownReviews.checked = viewModel.options.showUnknownReviews;
    controls.showOwned.checked = viewModel.options.showOwned;
    controls.showDlc.checked = viewModel.options.showDlc;
    controls.summary.textContent = viewModel.summary;
    controls.status.textContent = viewModel.statusMessage;
    controls.status.dataset.kind = viewModel.statusKind;
    controls.status.setAttribute("aria-live", viewModel.announcementMode === "assertive" ? "assertive" : "polite");
    controls.emptyHint.hidden = !viewModel.emptyHint;
    controls.emptyHint.textContent = viewModel.emptyHint || "";
    controls.activePreset.textContent = viewModel.activePresetLabel;
    document.body.dataset.activePreset = viewModel.activePresetId || "custom";
    for (const button of document.querySelectorAll("[data-preset-id]")) {
      button.dataset.active = button.dataset.presetId === (viewModel.activePresetId || "") ? "true" : "false";
    }
  }

  function scheduleManualApply(delay = 250) {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(() => {
      pendingPresetId = null;
      void postSettings(readManualPayload());
    }, delay);
  }

  async function refreshStatus() {
    const response = await fetch("/status", {
      headers: {
        "x-steam-sales-per-session": token
      }
    });
    if (!response.ok) return;
    const json = await response.json();
    applyViewModel(json.viewModel);
  }

  for (const button of document.querySelectorAll("[data-preset-id]")) {
    button.addEventListener("click", () => {
      pendingPresetId = button.dataset.presetId;
      void postSettings({
        presetId: pendingPresetId,
        language: controls.language.value
      });
    });
  }

  controls.language.addEventListener("change", () => {
    pendingPresetId = null;
    void postSettings(readManualPayload());
  });

  controls.minimumDiscountPercent.addEventListener("input", () => scheduleManualApply());
  controls.minimumDiscountPercent.addEventListener("change", () => scheduleManualApply(0));
  controls.minimumReviewCount.addEventListener("input", () => scheduleManualApply());
  controls.minimumReviewCount.addEventListener("change", () => scheduleManualApply(0));
  controls.minimumReviewGrade.addEventListener("change", () => scheduleManualApply(0));

  for (const element of [controls.enabled, controls.showUnknownDiscount, controls.showUnknownReviews, controls.showOwned, controls.showDlc]) {
    element.addEventListener("change", () => {
      pendingPresetId = null;
      void postSettings(readManualPayload());
    });
  }

  setInterval(refreshStatus, 1500);
})();
`;
}

export function createRequestTracker() {
  let latest = 0;
  return {
    begin(): number {
      latest += 1;
      return latest;
    },
    isCurrent(requestId: number): boolean {
      return requestId === latest;
    }
  };
}

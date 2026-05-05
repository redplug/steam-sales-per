import type { ProbeResult } from "../../src/filter/steamCdp.js";
import { matchPreset, type FilterOptions } from "../../src/filter/filterOptions.js";
import type { FilterDiagnostics } from "../../src/filter/domFilter.js";
import { panelCopy, presetLabel, reviewGradeLabel } from "./i18n.js";
import type { PanelViewModel, PanelStatusKind } from "./model.js";

export function buildPendingViewModel(options: FilterOptions): PanelViewModel {
  const text = panelCopy(options.language);
  const presetId = matchPreset(options);
  return {
    options,
    summary: buildSummary(options),
    statusKind: "applying",
    statusMessage: text.applying,
    announcementMode: "polite",
    activePresetId: presetId,
    activePresetLabel: presetId ? presetLabel(options.language, presetId) : text.customPreset,
    isCustomPreset: presetId === null,
    diagnostics: null,
    emptyHint: null
  };
}

export function buildRejectedViewModel(options: FilterOptions, message: string): PanelViewModel {
  const text = panelCopy(options.language);
  const presetId = matchPreset(options);
  return {
    options,
    summary: buildSummary(options),
    statusKind: "settings_rejected",
    statusMessage: `${text.settingsRejected} ${message}`,
    announcementMode: "assertive",
    activePresetId: presetId,
    activePresetLabel: presetId ? presetLabel(options.language, presetId) : text.customPreset,
    isCustomPreset: presetId === null,
    diagnostics: null,
    emptyHint: null
  };
}

export function buildInitialViewModel(options: FilterOptions): PanelViewModel {
  const text = panelCopy(options.language);
  const presetId = matchPreset(options);
  return {
    options,
    summary: buildSummary(options),
    statusKind: "starting",
    statusMessage: text.loading,
    announcementMode: "polite",
    activePresetId: presetId,
    activePresetLabel: presetId ? presetLabel(options.language, presetId) : text.customPreset,
    isCustomPreset: presetId === null,
    diagnostics: null,
    emptyHint: null
  };
}

export function buildAppliedViewModel(options: FilterOptions, result: ProbeResult): PanelViewModel {
  const presetId = matchPreset(options);
  const text = panelCopy(options.language);
  const diagnostics = isFilterDiagnostics(result.diagnostics) ? result.diagnostics : null;
  const activePresetLabel = presetId ? presetLabel(options.language, presetId) : text.customPreset;

  if (result.status === "debug_endpoint_unavailable" || result.status === "store_target_missing") {
    return {
      options,
      summary: buildSummary(options),
      statusKind: "steam_unavailable",
      statusMessage: `${result.message} ${text.openSteamHint}`.trim(),
      announcementMode: "assertive",
      activePresetId: presetId,
      activePresetLabel,
      isCustomPreset: presetId === null,
      diagnostics,
      emptyHint: null
    };
  }

  if (result.status === "injection_failed") {
    return {
      options,
      summary: buildSummary(options),
      statusKind: "structure_warning",
      statusMessage: result.message,
      announcementMode: "assertive",
      activePresetId: presetId,
      activePresetLabel,
      isCustomPreset: presetId === null,
      diagnostics,
      emptyHint: null
    };
  }

  if (!diagnostics) {
    return {
      options,
      summary: buildSummary(options),
      statusKind: "applied",
      statusMessage: localizedAppliedMessage(options.language, 0),
      announcementMode: "polite",
      activePresetId: presetId,
      activePresetLabel,
      isCustomPreset: presetId === null,
      diagnostics: null,
      emptyHint: null
    };
  }

  const statusKind = mapStatusKind(diagnostics.statusKind);
  return {
    options,
    summary: buildSummary(options),
    statusKind,
    statusMessage: buildStatusMessage(options, diagnostics, result.message),
    announcementMode: statusKind === "structure_warning" ? "assertive" : "polite",
    activePresetId: presetId,
    activePresetLabel,
    isCustomPreset: presetId === null,
    diagnostics,
    emptyHint: statusKind === "applied_empty" ? panelCopy(options.language).emptyHint : null
  };
}

export function buildSummary(options: FilterOptions): string {
  const language = options.language;
  if (language === "koreana") {
    return [
      `할인율 ${options.minimumDiscountPercent}%+`,
      `리뷰 ${options.minimumReviewCount}개+`,
      `${reviewGradeLabel(language, options.minimumReviewGrade)}+`,
      options.showUnknownDiscount ? "미확인 할인율 표시" : "미확인 할인율 숨김",
      options.showUnknownReviews ? "미확인 리뷰 표시" : "미확인 리뷰 숨김",
      options.showOwned ? "보유 제품 표시" : "보유 제품 숨김",
      options.showDlc ? "DLC 표시" : "DLC 숨김"
    ].join(", ");
  }

  if (language === "japanese") {
    return [
      `割引 ${options.minimumDiscountPercent}%+`,
      `レビュー ${options.minimumReviewCount}+`,
      `${reviewGradeLabel(language, options.minimumReviewGrade)}+`,
      options.showUnknownDiscount ? "不明な割引を表示" : "不明な割引を非表示",
      options.showUnknownReviews ? "不明なレビューを表示" : "不明なレビューを非表示",
      options.showOwned ? "購入済みを表示" : "購入済みを非表示",
      options.showDlc ? "DLC を表示" : "DLC を非表示"
    ].join(", ");
  }

  return [
    `${options.minimumDiscountPercent}%+ discount`,
    `${options.minimumReviewCount}+ reviews`,
    `${reviewGradeLabel(language, options.minimumReviewGrade)}+`,
    options.showUnknownDiscount ? "unknown discount shown" : "unknown discount hidden",
    options.showUnknownReviews ? "unknown reviews shown" : "unknown reviews hidden",
    options.showOwned ? "owned shown" : "owned hidden",
    options.showDlc ? "DLC shown" : "DLC hidden"
  ].join(", ");
}

function buildStatusMessage(options: FilterOptions, diagnostics: FilterDiagnostics, fallback: string): string {
  const text = panelCopy(options.language);
  if (diagnostics.statusKind === "applied_empty") {
    return localizedAppliedMessage(options.language, 0);
  }
  if (diagnostics.statusKind === "applied_partial") {
    return localizedPartialMessage(options.language, diagnostics.partialMetadata + diagnostics.unknownReviews);
  }
  if (diagnostics.statusKind === "structure_warning") {
    return fallback;
  }
  return localizedAppliedMessage(options.language, diagnostics.visible);
}

function mapStatusKind(kind: FilterDiagnostics["statusKind"]): PanelStatusKind {
  if (kind === "applied_empty") return "applied_empty";
  if (kind === "applied_partial") return "applied_partial";
  if (kind === "structure_warning") return "structure_warning";
  return "applied";
}

function isFilterDiagnostics(value: unknown): value is FilterDiagnostics {
  return Boolean(value && typeof value === "object" && "statusKind" in value);
}

function localizedAppliedMessage(language: FilterOptions["language"], visible: number): string {
  if (language === "koreana") {
    return `적용되었습니다. 현재 기준에 맞는 카드 ${visible}개를 남겼습니다.`;
  }
  if (language === "japanese") {
    return `適用しました。現在の条件に合うカードを ${visible} 件残しました。`;
  }
  return `Applied. ${visible} cards match your current bar.`;
}

function localizedPartialMessage(language: FilterOptions["language"], count: number): string {
  if (language === "koreana") {
    return `주의와 함께 적용되었습니다. 카드 ${count}개는 리뷰 데이터가 불완전해서 미확인 리뷰 규칙을 따랐습니다.`;
  }
  if (language === "japanese") {
    return `警告付きで適用しました。${count} 件のカードはレビュー情報が不完全だったため、不明レビューのルールを使いました。`;
  }
  return `Applied with warning. ${count} cards used your unknown-review rule.`;
}

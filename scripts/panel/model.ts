import type { FilterOptions, QualityPresetId } from "../../src/filter/filterOptions.js";
import type { FilterDiagnostics } from "../../src/filter/domFilter.js";

export type PanelStatusKind =
  | "starting"
  | "applying"
  | "applied"
  | "applied_empty"
  | "applied_partial"
  | "settings_rejected"
  | "structure_warning"
  | "steam_unavailable";

export type PanelAnnouncementMode = "polite" | "assertive";

export type PanelViewModel = {
  options: FilterOptions;
  summary: string;
  statusKind: PanelStatusKind;
  statusMessage: string;
  announcementMode: PanelAnnouncementMode;
  activePresetId: QualityPresetId | null;
  activePresetLabel: string;
  isCustomPreset: boolean;
  diagnostics: FilterDiagnostics | null;
  emptyHint: string | null;
};

export type SettingsPayload = {
  enabled: boolean;
  language: FilterOptions["language"];
  minimumDiscountPercent: number;
  minimumReviewCount: number;
  minimumReviewGrade: FilterOptions["minimumReviewGrade"];
  showUnknownDiscount: boolean;
  showOwned: boolean;
  showDlc: boolean;
  presetId?: QualityPresetId;
};

export type ValidatedSettings = {
  options: FilterOptions;
  presetId: QualityPresetId | null;
};

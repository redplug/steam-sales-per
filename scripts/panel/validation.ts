import {
  DEFAULT_FILTER_OPTIONS,
  FILTER_PRESETS,
  REVIEW_GRADE_ORDER,
  resolvePreset,
  type FilterLanguage,
  type FilterOptions,
  type QualityPresetId
} from "../../src/filter/filterOptions.js";
import { normalizeThreshold } from "../../src/filter/threshold.js";
import { panelCopy } from "./i18n.js";
import type { SettingsPayload, ValidatedSettings } from "./model.js";

const LANGUAGES: FilterLanguage[] = ["koreana", "english", "japanese"];

export function validateSettingsPayload(payload: unknown, fallbackLanguage: FilterLanguage): ValidatedSettings | { error: string } {
  if (!payload || typeof payload !== "object") {
    return { error: panelCopy(fallbackLanguage).settingsRejected };
  }

  const next = payload as Partial<SettingsPayload>;
  const languageResult = validateLanguage(next.language ?? fallbackLanguage, fallbackLanguage);
  if ("error" in languageResult) return languageResult;
  const language = languageResult.value;
  const text = panelCopy(language);

  if (next.presetId !== undefined) {
    const preset = validatePreset(next.presetId, language);
    if ("error" in preset) return preset;
    return {
      presetId: preset.value.id,
      options: {
        ...preset.value.values,
        language
      }
    };
  }

  const discount = normalizeThreshold(String(next.minimumDiscountPercent ?? DEFAULT_FILTER_OPTIONS.minimumDiscountPercent));
  if (!discount.ok) return { error: text.invalidDiscount };

  const reviewCount = Number(next.minimumReviewCount);
  if (!Number.isInteger(reviewCount) || reviewCount < 0) {
    return { error: text.invalidReviewCount };
  }

  const reviewGrade = validateReviewGrade(next.minimumReviewGrade, language);
  if ("error" in reviewGrade) return reviewGrade;

  const booleans = validateBooleans(
    {
      enabled: next.enabled,
      showUnknownDiscount: next.showUnknownDiscount,
      showUnknownReviews: next.showUnknownReviews,
      showOwned: next.showOwned,
      showDlc: next.showDlc
    },
    language
  );
  if ("error" in booleans) return booleans;

  const options: FilterOptions = {
    enabled: booleans.value.enabled,
    language,
    minimumDiscountPercent: discount.value,
    minimumReviewCount: reviewCount,
    minimumReviewGrade: reviewGrade.value,
    showUnknownDiscount: booleans.value.showUnknownDiscount,
    showUnknownReviews: booleans.value.showUnknownReviews,
    showOwned: booleans.value.showOwned,
    showDlc: booleans.value.showDlc
  };

  return {
    options,
    presetId: null
  };
}

function validatePreset(value: unknown, language: FilterLanguage): { value: (typeof FILTER_PRESETS)[number] } | { error: string } {
  if (typeof value !== "string") {
    return { error: panelCopy(language).invalidPreset };
  }

  const preset = resolvePreset(value as QualityPresetId);
  if (!preset) {
    return { error: panelCopy(language).invalidPreset };
  }

  return { value: preset };
}

function validateLanguage(value: unknown, fallbackLanguage: FilterLanguage): { value: FilterLanguage } | { error: string } {
  if (typeof value === "string" && LANGUAGES.includes(value as FilterLanguage)) {
    return { value: value as FilterLanguage };
  }
  if (value === undefined) return { value: fallbackLanguage };
  return { error: panelCopy(fallbackLanguage).invalidLanguage };
}

function validateReviewGrade(
  value: unknown,
  language: FilterLanguage
): { value: FilterOptions["minimumReviewGrade"] } | { error: string } {
  if (typeof value === "string" && REVIEW_GRADE_ORDER.includes(value as FilterOptions["minimumReviewGrade"])) {
    return { value: value as FilterOptions["minimumReviewGrade"] };
  }
  return { error: panelCopy(language).invalidReviewGrade };
}

function validateBooleans(
  values: Record<string, unknown>,
  language: FilterLanguage
):
  | { value: { enabled: boolean; showUnknownDiscount: boolean; showUnknownReviews: boolean; showOwned: boolean; showDlc: boolean } }
  | { error: string } {
  for (const value of Object.values(values)) {
    if (typeof value !== "boolean") {
      return { error: panelCopy(language).badBoolean };
    }
  }

  return {
    value: values as {
      enabled: boolean;
      showUnknownDiscount: boolean;
      showUnknownReviews: boolean;
      showOwned: boolean;
      showDlc: boolean;
    }
  };
}

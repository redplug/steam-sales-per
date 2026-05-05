export type FilterLanguage = "koreana" | "english" | "japanese";

export type ReviewGrade =
  | "overwhelmingly_positive"
  | "very_positive"
  | "mostly_positive"
  | "positive"
  | "mixed"
  | "mostly_negative"
  | "very_negative"
  | "overwhelmingly_negative";

export type QualityPresetId = "deep-sale-hits" | "safe-bets" | "hidden-gems-ish";

export type FilterOptions = {
  enabled: boolean;
  language: FilterLanguage;
  minimumDiscountPercent: number;
  minimumReviewCount: number;
  minimumReviewGrade: ReviewGrade;
  showUnknownDiscount: boolean;
  showUnknownReviews: boolean;
  showOwned: boolean;
  showDlc: boolean;
};

export type FilterPreset = {
  id: QualityPresetId;
  values: FilterOptions;
};

export const REVIEW_GRADE_ORDER: ReviewGrade[] = [
  "overwhelmingly_positive",
  "very_positive",
  "mostly_positive",
  "positive",
  "mixed",
  "mostly_negative",
  "very_negative",
  "overwhelmingly_negative"
];

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  enabled: true,
  language: "koreana",
  minimumDiscountPercent: 75,
  minimumReviewCount: 500,
  minimumReviewGrade: "very_positive",
  showUnknownDiscount: false,
  showUnknownReviews: false,
  showOwned: false,
  showDlc: false
};

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "deep-sale-hits",
    values: {
      ...DEFAULT_FILTER_OPTIONS
    }
  },
  {
    id: "safe-bets",
    values: {
      ...DEFAULT_FILTER_OPTIONS,
      minimumDiscountPercent: 50,
      minimumReviewCount: 1000,
      minimumReviewGrade: "overwhelmingly_positive"
    }
  },
  {
    id: "hidden-gems-ish",
    values: {
      ...DEFAULT_FILTER_OPTIONS,
      minimumDiscountPercent: 60,
      minimumReviewCount: 100,
      minimumReviewGrade: "mostly_positive",
      showUnknownReviews: true
    }
  }
];

export function resolvePreset(id: QualityPresetId): FilterPreset | undefined {
  return FILTER_PRESETS.find((preset) => preset.id === id);
}

export function matchPreset(options: FilterOptions): QualityPresetId | null {
  for (const preset of FILTER_PRESETS) {
    if (isSameFilterOptions(preset.values, options)) {
      return preset.id;
    }
  }
  return null;
}

export function createDisabledFilterOptions(language: FilterLanguage = "koreana"): FilterOptions {
  return {
    enabled: false,
    language,
    minimumDiscountPercent: 0,
    minimumReviewCount: 0,
    minimumReviewGrade: "overwhelmingly_negative",
    showUnknownDiscount: true,
    showUnknownReviews: true,
    showOwned: true,
    showDlc: true
  };
}

function isSameFilterOptions(left: FilterOptions, right: FilterOptions): boolean {
  return (
    left.enabled === right.enabled &&
    left.language === right.language &&
    left.minimumDiscountPercent === right.minimumDiscountPercent &&
    left.minimumReviewCount === right.minimumReviewCount &&
    left.minimumReviewGrade === right.minimumReviewGrade &&
    left.showUnknownDiscount === right.showUnknownDiscount &&
    left.showUnknownReviews === right.showUnknownReviews &&
    left.showOwned === right.showOwned &&
    left.showDlc === right.showDlc
  );
}

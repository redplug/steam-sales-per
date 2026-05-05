import {
  FILTER_PRESETS,
  type FilterLanguage,
  type QualityPresetId,
  type ReviewGrade
} from "../../src/filter/filterOptions.js";

type PanelCopy = {
  title: string;
  purpose: string;
  summaryLabel: string;
  presetsLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
  minimumDiscountPercent: string;
  minimumReviewCount: string;
  minimumReviewGrade: string;
  showUnknownDiscount: string;
  showOwned: string;
  showDlc: string;
  enabled: string;
  customPreset: string;
  loading: string;
  applying: string;
  settingsRejected: string;
  emptyHint: string;
  openSteamHint: string;
  invalidDiscount: string;
  invalidReviewCount: string;
  invalidReviewGrade: string;
  invalidLanguage: string;
  invalidPreset: string;
  badBoolean: string;
};

const COPY: Record<FilterLanguage, PanelCopy> = {
  english: {
    title: "Steam Sale Quality Filter",
    purpose: "Trim the Steam sale page down to games worth a second look.",
    summaryLabel: "Active quality bar",
    presetsLabel: "Presets",
    primaryLabel: "Quality bar",
    secondaryLabel: "Visibility rules",
    minimumDiscountPercent: "Minimum discount",
    minimumReviewCount: "Minimum reviews",
    minimumReviewGrade: "Minimum review grade",
    showUnknownDiscount: "Show products without recognized discount",
    showOwned: "Show already owned products",
    showDlc: "Show DLC products",
    enabled: "Enable filter",
    customPreset: "Custom",
    loading: "Opening Steam and preparing the panel...",
    applying: "Applying your quality bar...",
    settingsRejected: "Settings rejected.",
    emptyHint: "No games match this bar. Try lowering reviews or review grade.",
    openSteamHint: "Open the Steam Store or Specials page in the official client.",
    invalidDiscount: "Discount must be a whole number from 0 to 100.",
    invalidReviewCount: "Review count must be 0 or greater.",
    invalidReviewGrade: "Review grade is not recognized.",
    invalidLanguage: "Language is not recognized.",
    invalidPreset: "Preset is not recognized.",
    badBoolean: "Toggle values must be true or false."
  },
  koreana: {
    title: "Steam 세일 품질 필터",
    purpose: "Steam 세일 페이지를 다시 볼 만한 게임만 남기세요.",
    summaryLabel: "현재 품질 기준",
    presetsLabel: "프리셋",
    primaryLabel: "품질 기준",
    secondaryLabel: "표시 규칙",
    minimumDiscountPercent: "최소 할인율",
    minimumReviewCount: "최소 리뷰 수",
    minimumReviewGrade: "최소 평가 등급",
    showUnknownDiscount: "할인율을 읽지 못한 제품 보이기",
    showOwned: "이미 보유한 제품 보이기",
    showDlc: "DLC 제품 보이기",
    enabled: "필터 사용",
    customPreset: "직접 설정",
    loading: "Steam을 준비하고 패널을 여는 중입니다...",
    applying: "현재 품질 기준을 적용하는 중입니다...",
    settingsRejected: "설정이 거절되었습니다.",
    emptyHint: "조건에 맞는 게임이 없습니다. 리뷰 수나 평가 등급을 낮춰 보세요.",
    openSteamHint: "공식 Steam 클라이언트에서 상점이나 Specials 페이지를 여세요.",
    invalidDiscount: "할인율은 0부터 100 사이의 정수여야 합니다.",
    invalidReviewCount: "리뷰 수는 0 이상이어야 합니다.",
    invalidReviewGrade: "평가 등급 값을 이해하지 못했습니다.",
    invalidLanguage: "언어 값을 이해하지 못했습니다.",
    invalidPreset: "프리셋을 찾지 못했습니다.",
    badBoolean: "토글 값은 true 또는 false여야 합니다."
  },
  japanese: {
    title: "Steam セール品質フィルター",
    purpose: "Steam セールを、あとで見る価値がある候補だけに絞ります。",
    summaryLabel: "現在の品質バー",
    presetsLabel: "プリセット",
    primaryLabel: "品質バー",
    secondaryLabel: "表示ルール",
    minimumDiscountPercent: "最小割引率",
    minimumReviewCount: "最小レビュー数",
    minimumReviewGrade: "最小レビュー評価",
    showUnknownDiscount: "割引率を認識できない製品を表示",
    showOwned: "購入済み製品を表示",
    showDlc: "DLC 製品を表示",
    enabled: "フィルターを有効化",
    customPreset: "カスタム",
    loading: "Steam を準備してパネルを開いています...",
    applying: "現在の品質バーを適用しています...",
    settingsRejected: "設定が拒否されました。",
    emptyHint: "条件に合うゲームがありません。レビュー数か評価を緩めてみてください。",
    openSteamHint: "公式 Steam クライアントでストアか Specials ページを開いてください。",
    invalidDiscount: "割引率は 0 から 100 の整数で入力してください。",
    invalidReviewCount: "レビュー数は 0 以上で入力してください。",
    invalidReviewGrade: "レビュー評価を認識できません。",
    invalidLanguage: "言語を認識できません。",
    invalidPreset: "プリセットを認識できません。",
    badBoolean: "トグル値は true か false である必要があります。"
  }
};

const GRADE_LABELS: Record<FilterLanguage, Record<ReviewGrade, string>> = {
  english: {
    overwhelmingly_positive: "Overwhelmingly Positive",
    very_positive: "Very Positive",
    mostly_positive: "Mostly Positive",
    positive: "Positive",
    mixed: "Mixed",
    mostly_negative: "Mostly Negative",
    very_negative: "Very Negative",
    overwhelmingly_negative: "Overwhelmingly Negative"
  },
  koreana: {
    overwhelmingly_positive: "압도적으로 긍정적",
    very_positive: "매우 긍정적",
    mostly_positive: "대체로 긍정적",
    positive: "긍정적",
    mixed: "복합적",
    mostly_negative: "대체로 부정적",
    very_negative: "매우 부정적",
    overwhelmingly_negative: "압도적으로 부정적"
  },
  japanese: {
    overwhelmingly_positive: "圧倒的に好評",
    very_positive: "非常に好評",
    mostly_positive: "ほぼ好評",
    positive: "好評",
    mixed: "賛否両論",
    mostly_negative: "やや不評",
    very_negative: "不評",
    overwhelmingly_negative: "圧倒的に不評"
  }
};

const PRESET_LABELS: Record<FilterLanguage, Record<QualityPresetId, string>> = {
  english: {
    "deep-sale-hits": "Deep Sale Hits",
    "safe-bets": "Safe Bets",
    "hidden-gems-ish": "Hidden Gems-ish"
  },
  koreana: {
    "deep-sale-hits": "딥 세일 히트",
    "safe-bets": "안전한 선택",
    "hidden-gems-ish": "숨은 보석 느낌"
  },
  japanese: {
    "deep-sale-hits": "深割引ヒット",
    "safe-bets": "手堅い候補",
    "hidden-gems-ish": "隠れた良作寄り"
  }
};

export function panelCopy(language: FilterLanguage): PanelCopy {
  return COPY[language];
}

export function reviewGradeLabel(language: FilterLanguage, grade: ReviewGrade): string {
  return GRADE_LABELS[language][grade];
}

export function presetLabel(language: FilterLanguage, presetId: QualityPresetId): string {
  return PRESET_LABELS[language][presetId];
}

export function presetOptionsForLanguage(language: FilterLanguage): Array<{ id: QualityPresetId; label: string }> {
  return FILTER_PRESETS.map((preset) => ({
    id: preset.id,
    label: presetLabel(language, preset.id)
  }));
}

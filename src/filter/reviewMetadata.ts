import type { FilterLanguage, ReviewGrade } from "./filterOptions.js";

export type ReviewMetadata = {
  reviewCount: number | null;
  reviewGrade: ReviewGrade | null;
  countMissing: boolean;
  gradeMissing: boolean;
};

type GradeSynonyms = Record<ReviewGrade, string[]>;

const REVIEW_GRADE_SYNONYMS: Record<FilterLanguage, GradeSynonyms> = {
  english: {
    overwhelmingly_positive: ["overwhelmingly positive"],
    very_positive: ["very positive"],
    mostly_positive: ["mostly positive"],
    positive: ["positive"],
    mixed: ["mixed"],
    mostly_negative: ["mostly negative"],
    very_negative: ["very negative"],
    overwhelmingly_negative: ["overwhelmingly negative"]
  },
  koreana: {
    overwhelmingly_positive: ["압도적으로 긍정적"],
    very_positive: ["매우 긍정적"],
    mostly_positive: ["대체로 긍정적"],
    positive: ["긍정적"],
    mixed: ["복합적"],
    mostly_negative: ["대체로 부정적"],
    very_negative: ["매우 부정적"],
    overwhelmingly_negative: ["압도적으로 부정적"]
  },
  japanese: {
    overwhelmingly_positive: ["圧倒的に好評"],
    very_positive: ["非常に好評"],
    mostly_positive: ["ほぼ好評"],
    positive: ["好評"],
    mixed: ["賛否両論"],
    mostly_negative: ["やや不評"],
    very_negative: ["不評"],
    overwhelmingly_negative: ["圧倒的に不評"]
  }
};

const NO_REVIEW_SYNONYMS: Record<FilterLanguage, string[]> = {
  english: ["no user reviews", "no reviews"],
  koreana: ["사용자 평가 없음", "평가 없음"],
  japanese: ["ユーザーレビューはありません", "レビューはありません"]
};

export function extractReviewMetadata(language: FilterLanguage, texts: string[]): ReviewMetadata {
  let reviewCount: number | null = null;
  let reviewGrade: ReviewGrade | null = null;

  for (const text of texts) {
    if (reviewGrade === null) {
      reviewGrade = parseReviewGrade(language, text);
    }
    if (reviewCount === null) {
      reviewCount = parseReviewCount(language, text);
    }
    if (reviewGrade !== null && reviewCount !== null) {
      break;
    }
  }

  const hasNoReviews = texts.some((text) => containsNoReviewLabel(language, text));
  if (hasNoReviews) {
    reviewCount = reviewCount ?? 0;
  }

  return {
    reviewCount,
    reviewGrade,
    countMissing: reviewCount === null,
    gradeMissing: reviewGrade === null
  };
}

export function parseReviewGrade(language: FilterLanguage, text: string): ReviewGrade | null {
  const normalized = normalizeText(text);
  for (const grade of Object.keys(REVIEW_GRADE_SYNONYMS[language]) as ReviewGrade[]) {
    if (REVIEW_GRADE_SYNONYMS[language][grade].some((label) => normalized.includes(normalizeText(label)))) {
      return grade;
    }
  }
  return null;
}

export function parseReviewCount(language: FilterLanguage, text: string): number | null {
  const normalized = normalizeText(text);

  const explicitMatch = normalized.match(/([\d,. ]{1,16})\s*(user reviews|reviews|개의 평가|평가|件のレビュー|レビュー)/i);
  if (explicitMatch) {
    return normalizeInteger(explicitMatch[1]);
  }

  const parenMatch = normalized.match(/\(([\d,. ]{1,16})\)/);
  if (parenMatch) {
    return normalizeInteger(parenMatch[1]);
  }

  if (containsNoReviewLabel(language, text)) {
    return 0;
  }

  return null;
}

function containsNoReviewLabel(language: FilterLanguage, text: string): boolean {
  const normalized = normalizeText(text);
  return NO_REVIEW_SYNONYMS[language].some((label) => normalized.includes(normalizeText(label)));
}

function normalizeInteger(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

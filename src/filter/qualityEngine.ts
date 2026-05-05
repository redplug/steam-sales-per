import { REVIEW_GRADE_ORDER, type FilterOptions, type ReviewGrade } from "./filterOptions.js";

export type ReviewMetadataState = "known" | "partial" | "unknown";

export type CardHideReason =
  | "below_discount_floor"
  | "owned_hidden"
  | "dlc_hidden"
  | "unknown_discount_hidden"
  | "below_review_count_floor"
  | "below_review_grade_floor";

export type CardMetadata = {
  discountPercent: number | null;
  reviewCount: number | null;
  reviewGrade: ReviewGrade | null;
  owned: boolean;
  dlc: boolean;
};

export type CardDecision = {
  visible: boolean;
  reviewState: ReviewMetadataState;
  hideReason: CardHideReason | null;
};

export function decideCardVisibility(options: FilterOptions, metadata: CardMetadata): CardDecision {
  const reviewState = classifyReviewMetadataState(metadata);

  if (!options.enabled) {
    return { visible: true, reviewState, hideReason: null };
  }

  if (!options.showOwned && metadata.owned) {
    return { visible: false, reviewState, hideReason: "owned_hidden" };
  }

  if (!options.showDlc && metadata.dlc) {
    return { visible: false, reviewState, hideReason: "dlc_hidden" };
  }

  if (metadata.discountPercent === null) {
    return {
      visible: options.showUnknownDiscount,
      reviewState,
      hideReason: options.showUnknownDiscount ? null : "unknown_discount_hidden"
    };
  }

  if (metadata.discountPercent < options.minimumDiscountPercent) {
    return { visible: false, reviewState, hideReason: "below_discount_floor" };
  }

  if (metadata.reviewCount !== null && metadata.reviewCount < options.minimumReviewCount) {
    return { visible: false, reviewState, hideReason: "below_review_count_floor" };
  }

  if (metadata.reviewGrade !== null && !meetsReviewGradeFloor(metadata.reviewGrade, options.minimumReviewGrade)) {
    return { visible: false, reviewState, hideReason: "below_review_grade_floor" };
  }

  return { visible: true, reviewState, hideReason: null };
}

export function classifyReviewMetadataState(metadata: Pick<CardMetadata, "reviewCount" | "reviewGrade">): ReviewMetadataState {
  const hasCount = metadata.reviewCount !== null;
  const hasGrade = metadata.reviewGrade !== null;
  if (hasCount && hasGrade) return "known";
  if (hasCount || hasGrade) return "partial";
  return "unknown";
}

export function meetsReviewGradeFloor(grade: ReviewGrade | null, minimum: ReviewGrade): boolean {
  if (grade === null) return false;
  return REVIEW_GRADE_ORDER.indexOf(grade) <= REVIEW_GRADE_ORDER.indexOf(minimum);
}

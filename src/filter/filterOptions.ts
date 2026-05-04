export type FilterOptions = {
  enabled: boolean;
  threshold: number;
  language: "koreana" | "english" | "japanese";
  showUnknown: boolean;
  showOwned: boolean;
  showDlc: boolean;
};

export const DEFAULT_FILTER_OPTIONS: Omit<FilterOptions, "threshold"> = {
  enabled: true,
  language: "koreana",
  showUnknown: false,
  showOwned: false,
  showDlc: false
};

export type ArticleLocaleCode = "en" | "ar" | "ur";

export const ARTICLE_LOCALES: {
  code: ArticleLocaleCode;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
];

export const KB_LIST_LOCALE_STORAGE_KEY = "kb-panel-article-list-locale";

export function readStoredListLocale(): ArticleLocaleCode {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(KB_LIST_LOCALE_STORAGE_KEY);
  if (v === "ar" || v === "ur" || v === "en") return v;
  return "en";
}

export function writeStoredListLocale(locale: ArticleLocaleCode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KB_LIST_LOCALE_STORAGE_KEY, locale);
}

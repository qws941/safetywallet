export const locales = ["ko", "en", "vi", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export const localeNames: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
};

/**
 * The languages the app speaks. Hebrew is the default; Arabic and English
 * are first class too. See "Right-to-left languages are first class" in
 * docs/00-product.markdown.
 *
 * No browser APIs in this file, so the rule for picking a language can be
 * tested on its own.
 */

export const LANGUAGES = {
  he: { name: "עברית", dir: "rtl" },
  ar: { name: "العربية", dir: "rtl" },
  en: { name: "English", dir: "ltr" },
} as const;

export type Lang = keyof typeof LANGUAGES;
export type Direction = (typeof LANGUAGES)[Lang]["dir"];

export const DEFAULT_LANG: Lang = "he";

/** The key the chosen language is saved under in localStorage. */
export const LANG_STORAGE_KEY = "greenpath.lang";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && Object.hasOwn(LANGUAGES, value);
}

/**
 * Which language to show: the one the person picked, else the first of
 * their browser's languages we speak ("ar-EG" counts as "ar"), else Hebrew.
 */
export function pickLanguage(
  saved: string | null,
  browserLanguages: readonly string[],
): Lang {
  if (isLang(saved)) return saved;
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split("-")[0];
    // "iw" is the old code for Hebrew, still sent by some Android browsers.
    const lang = base === "iw" ? "he" : base;
    if (isLang(lang)) return lang;
  }
  return DEFAULT_LANG;
}

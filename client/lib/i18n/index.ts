import { LANG } from "../config";
import { LANG_STORAGE_KEY, type Lang } from "./languages";
import { STRINGS } from "./strings";

export { LANGUAGES, type Lang } from "./languages";
export type { Strings } from "./strings";

/**
 * The words for the current language: `t.nav.map`, `t.screens.home.title`.
 *
 * The language is fixed for the life of the page (see client/lib/config.ts),
 * so this is a plain object, not a hook.
 */
export const t = STRINGS[LANG];

// client/index.html titles the tab in Hebrew; name it in the chosen language.
document.title = t.appName;

/**
 * Switches language. Saves the choice and reloads, so every part of the
 * app - text, direction, dates, the calendar - starts again in the new one.
 */
export function setLanguage(lang: Lang) {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  window.location.reload();
}

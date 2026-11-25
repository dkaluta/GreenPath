/**
 * Every setting the browser app reads, in one place.
 *
 * Nothing else in client/ should touch `import.meta.env` directly. Keeping it
 * here means you can see the app's whole configuration on one screen, and it
 * gives you somewhere to put the "is this even set up yet?" checks below.
 *
 * Remember: everything in this file ends up inside the JavaScript sent to the
 * browser. It is all public.
 *
 * The secrets live in the same .env file, on the lines WITHOUT a VITE_
 * prefix. That prefix is the only thing keeping them apart, so never add one
 * to a secret. The server reads them - see server/env.ts.
 */

import {
  LANG_STORAGE_KEY,
  LANGUAGES,
  pickLanguage,
  type Direction,
  type Lang,
} from "./i18n/languages";

/**
 * The language for this page load: the one the person picked, else their
 * browser's, else Hebrew. Switching language saves the choice and reloads
 * (setLanguage in client/lib/i18n), so these stay constant while the page
 * is open. The list of languages is in client/lib/i18n/languages.ts.
 */
export const LANG: Lang = pickLanguage(
  readSavedLanguage(),
  navigator.languages,
);

/** Text direction for the whole app, from the language. */
export const DIRECTION: Direction = LANGUAGES[LANG].dir;

// client/index.html starts as Hebrew; correct it before anything draws.
document.documentElement.lang = LANG;
document.documentElement.dir = DIRECTION;

function readSavedLanguage(): string | null {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    // Some private-browsing modes refuse localStorage. Fall back quietly.
    return null;
  }
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * False until someone fills in .env. The app uses this to show a helpful
 * "not set up yet" screen instead of crashing with a blank page.
 */
export const SUPABASE_ENABLED = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Shows the /components gallery and the /demos pages. Set VITE_SHOW_DEMOS to
 * "false" in .env before handing the app over to the organisation.
 */
export const SHOW_DEMOS = import.meta.env.VITE_SHOW_DEMOS !== "false";

/** Shown in the header bar and anywhere else the app names itself. */
export const APP_NAME = "GreenPath"; // What people see is t.appName, per language

/** The links and credits in the header and footer. Change them to your own. */
export const COURSE_GITHUB = "https://github.com/product-jam-2027";
export const COURSE_CREDITS = "Product Jam 2027";

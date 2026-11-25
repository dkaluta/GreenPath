import { useSyncExternalStore } from "react";

/**
 * Light and dark. The person picks System (the default: follow the
 * computer), Light or Dark in the app menu; the choice is kept on this
 * device in localStorage.
 *
 * What the CSS sees is the result, never the setting: `<html data-theme>`
 * is always "light" or "dark", and client/styles/tokens.css swaps every
 * colour token under `:root[data-theme="dark"]`. The map reads the same
 * tokens, and subscribes here to rebuild its style when the result changes
 * (client/features/map/MapView.tsx), so the UI and the map always agree.
 */

export type ThemeSetting = "system" | "light" | "dark";
export type Theme = "light" | "dark";

export const THEME_SETTINGS: readonly ThemeSetting[] = [
  "system",
  "light",
  "dark",
];

const STORAGE_KEY = "greenpath.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();
let setting: ThemeSetting = readSetting();

function readSetting(): ThemeSetting {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Private browsing can refuse storage: follow the system.
  }
  return "system";
}

function systemTheme(): Theme {
  return typeof window.matchMedia === "function" &&
    window.matchMedia(DARK_QUERY).matches
    ? "dark"
    : "light";
}

/** Light or dark right now, from the setting and the system. */
export function currentTheme(): Theme {
  return setting === "system" ? systemTheme() : setting;
}

export function currentThemeSetting(): ThemeSetting {
  return setting;
}

/** Puts the result on <html>, then tells everyone who listens. */
function apply() {
  const theme = currentTheme();
  const root = document.documentElement;
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
  for (const listener of listeners) listener();
}

export function setThemeSetting(next: ThemeSetting) {
  setting = next;
  try {
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not saved, but it still applies until the page is closed.
  }
  apply();
}

/**
 * Calls `onChange` whenever the setting or, under System, the computer's
 * own light or dark changes. Returns the way to stop.
 */
export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The setting, for the switch. Re-renders when it changes. */
export function useThemeSetting(): ThemeSetting {
  return useSyncExternalStore(subscribeTheme, currentThemeSetting);
}

// Applied as soon as this file loads (client/main.tsx imports it first), so
// the first frame is already in the right colours. Under System, follow the
// computer when it switches.
apply();
if (typeof window.matchMedia === "function") {
  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    if (setting === "system") apply();
  });
}

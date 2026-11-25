import { useSyncExternalStore } from "react";

/** True while the media query matches, and updates when it changes. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Wide enough for the Google Maps-like desktop layout. Matches the CSS. */
export const DESKTOP_QUERY = "(min-width: 56rem)";

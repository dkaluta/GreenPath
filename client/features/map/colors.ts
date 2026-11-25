/**
 * The map's colours, read from the --map-* tokens in client/styles/tokens.css
 * while the app runs, so the map and the UI are always in the same palette.
 * Change a colour there, never here.
 */

/** Every --map-* token the style uses, by its name without the prefix. */
export const MAP_COLOR_TOKENS = [
  "land",
  "park",
  "water",
  "building",
  "street",
  "street-casing",
  "shade",
  "sun",
  "label",
  "label-park",
  "location",
  "poi",
] as const;

export type MapColorToken = (typeof MAP_COLOR_TOKENS)[number];
export type MapColors = Record<MapColorToken, string>;

/**
 * Used when a token is missing, for example in tests where there is no
 * stylesheet. They match the light values in tokens.css.
 */
export const FALLBACK_MAP_COLORS: MapColors = {
  land: "#f3f0e8",
  park: "#80af80",
  water: "#d9e7ff",
  building: "#e7e2d7",
  street: "#ffffff",
  "street-casing": "#e2ddd2",
  shade: "#80af80",
  sun: "#d9a441",
  label: "#584533",
  "label-park": "#3f6b47",
  location: "#584533",
  poi: "#3f6b47",
};

/**
 * Reads the tokens from the page. A custom property's computed value has its
 * var() references already filled in, so `--map-park: var(--color-leaf)`
 * comes back as the hex value.
 */
export function readMapColors(
  element: Element = document.documentElement,
): MapColors {
  const style = getComputedStyle(element);
  const colors = { ...FALLBACK_MAP_COLORS };
  for (const token of MAP_COLOR_TOKENS) {
    const value = style.getPropertyValue(`--map-${token}`).trim();
    if (value) colors[token] = value;
  }
  return colors;
}

/** The query the dark tokens in tokens.css hang off. */
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

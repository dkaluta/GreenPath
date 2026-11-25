import { LANG } from "../../lib/config";

/*
 * Small helpers for putting numbers into the words in strings.ts. Numbers
 * always go through Intl with the current language, never by hand.
 */

/** Fills "{name}" placeholders: fill("{count} trees", { count: 3 }). */
export function fill(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** A plain number in the current language: 1,640 or ١٬٦٤٠ depending. */
export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat(LANG, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

/** Picks the singular or plural text and fills in the count. */
export function plural(
  forms: { one: string; other: string },
  count: number,
): string {
  return fill(count === 1 ? forms.one : forms.other, {
    count: formatNumber(count),
  });
}

/** "8 m" or "1.2 km", in the current language. */
export function formatDistance(meters: number) {
  const km = meters >= 1000;
  return new Intl.NumberFormat(LANG, {
    style: "unit",
    unit: km ? "kilometer" : "meter",
    unitDisplay: "short",
    maximumFractionDigits: km ? 1 : 0,
  }).format(km ? meters / 1000 : meters);
}

/** 0.78 -> "78%", in the current language. */
export function formatPercent(share: number) {
  return new Intl.NumberFormat(LANG, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(share);
}

import type { WalkUnit } from "@shared/schemas/route";
import { LANG } from "../../lib/config";
import { t } from "../../lib/i18n";

/*
 * Numbers on the route screens, always through Intl in the current language,
 * never built by hand. See "Three languages" in docs/00-product.markdown.
 */

const minutes = new Intl.NumberFormat(LANG, {
  style: "unit",
  unit: "minute",
  unitDisplay: "short",
  maximumFractionDigits: 0,
});
const kilometres = new Intl.NumberFormat(LANG, {
  style: "unit",
  unit: "kilometer",
  unitDisplay: "short",
  maximumFractionDigits: 1,
});
const metres = new Intl.NumberFormat(LANG, {
  style: "unit",
  unit: "meter",
  unitDisplay: "short",
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat(LANG, {
  style: "percent",
  maximumFractionDigits: 0,
});
const plain = new Intl.NumberFormat(LANG, { maximumFractionDigits: 0 });

/** "14 min", "14 דק׳", "١٤ د" */
export function formatDuration(seconds: number) {
  return minutes.format(Math.max(1, Math.round(seconds / 60)));
}

/** "850 m" under a kilometre, "2.4 km" above. */
export function formatDistance(m: number) {
  return m < 1000
    ? metres.format(Math.round(m / 10) * 10)
    : kilometres.format(m / 1000);
}

/** "78% צל" */
export function formatShade(share: number) {
  return t.route.shadeShare.replace("{percent}", percent.format(share));
}

export function formatTrees(count: number) {
  return t.route.trees.replace("{count}", plain.format(count));
}

/**
 * The walk-setup counter, split so the number can be big and the unit
 * small: { number: "30", unit: "דק׳" }. Steps have no Intl unit, so their
 * word comes from strings.ts.
 */
export function formatWalkValue(unit: WalkUnit, value: number) {
  if (unit === "steps")
    return { number: plain.format(value), unit: t.walk.stepsUnit };
  const format =
    unit === "minutes" ? minutes : value >= 1000 ? kilometres : metres;
  const parts = format.formatToParts(
    unit === "meters" && value >= 1000 ? value / 1000 : value,
  );
  return {
    number: parts
      .filter((p) => p.type !== "unit" && p.type !== "literal")
      .map((p) => p.value)
      .join(""),
    unit: parts.find((p) => p.type === "unit")?.value ?? "",
  };
}

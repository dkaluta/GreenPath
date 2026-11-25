import type { Route } from "@shared/schemas/route";
import type { MapLine } from "../map";

/**
 * The routes as map lines: the others faded underneath, then the chosen one
 * split into its shaded and sunny stretches. Ids are "<route id>:<n>".
 */
export function routeLines(
  routes: Route[],
  selected: Route | undefined,
): MapLine[] {
  const lines: MapLine[] = routes
    .filter((route) => route !== selected)
    .map((route) => ({
      id: `${route.id}:0`,
      coordinates: route.geometry.coordinates,
      kind: "plain",
      dimmed: true,
    }));
  if (!selected) return lines;

  const coords = selected.geometry.coordinates;
  let start = 0;
  for (let i = 1; i <= selected.segment_shade.length; i++) {
    const shaded = (selected.segment_shade[start] ?? 0) >= 0.5;
    const next = selected.segment_shade[i];
    if (i < selected.segment_shade.length && next >= 0.5 === shaded) continue;
    lines.push({
      id: `${selected.id}:${lines.length}`,
      coordinates: coords.slice(start, i + 1),
      kind: shaded ? "shade" : "sun",
    });
    start = i;
  }
  return lines;
}

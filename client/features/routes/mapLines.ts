import type { Route } from "@shared/schemas/route";
import type { LngLat, MapLine } from "../map";

/** A piece of route at least this shaded is drawn as shade, else as sun. */
export const SHADED = 0.5;

/** Separates the route id from the stretch number in a line id. */
const SEPARATOR = "~";

/**
 * Splits a route into map lines, one per run of shaded or sunny pieces, so
 * the map shows where the shade is. Line ids are "<route id>~<n>"; get the
 * route back with routeIdOf().
 */
export function routeToLines(route: Route, dimmed = false): MapLine[] {
  const coords = route.geometry.coordinates as LngLat[];
  const lines: MapLine[] = [];
  let start = 0;
  for (let i = 1; i <= route.segment_shade.length; i++) {
    const kind = (j: number) =>
      route.segment_shade[j] >= SHADED ? "shade" : "sun";
    if (i === route.segment_shade.length || kind(i) !== kind(start)) {
      lines.push({
        id: `${route.id}${SEPARATOR}${lines.length}`,
        coordinates: coords.slice(start, i + 1),
        kind: kind(start),
        dimmed,
      });
      start = i;
    }
  }
  return lines;
}

/** The route id a line from routeToLines() belongs to. */
export function routeIdOf(lineId: string) {
  return lineId.split(SEPARATOR)[0];
}

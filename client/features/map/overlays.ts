import type { Feature, FeatureCollection, LineString, Point } from "geojson";

/**
 * What other screens draw on the map. Plain data, no map library types, so
 * a route from the server can be turned into these without knowing about
 * MapLibre.
 *
 * Coordinates are [longitude, latitude], the GeoJSON order, not the other
 * way round.
 */
export type LngLat = [lng: number, lat: number];

export type MapLine = {
  /** Unique among the lines on the map. */
  id: string;
  coordinates: LngLat[];
  /**
   * "shade" (the default) is a shaded stretch, thick and leaf green.
   * "sun" is a stretch in the sun. "plain" is the brown text colour, for
   * anything that is neither.
   */
  kind?: "shade" | "sun" | "plain";
  /** Faded, for a route that is not the selected one. */
  dimmed?: boolean;
  /** Overrides the colour of the kind. Prefer a kind, so dark mode works. */
  color?: string;
};

export type MapMarker = {
  id: string;
  position: LngLat;
  /**
   * "tree" is green, "task" (a tree to check) is sun yellow, "destination"
   * is a larger brown dot.
   */
  kind?: "tree" | "task" | "destination";
  /** Text under the marker, already in the current language. */
  label?: string;
  color?: string;
};

export function linesToGeoJSON(
  lines: readonly MapLine[],
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: lines.map((line): Feature<LineString> => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: line.coordinates },
      properties: withoutUndefined({
        id: line.id,
        kind: line.kind ?? "shade",
        dimmed: line.dimmed ?? false,
        color: line.color,
      }),
    })),
  };
}

export function markersToGeoJSON(
  markers: readonly MapMarker[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: markers.map((marker): Feature<Point> => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: marker.position },
      properties: withoutUndefined({
        id: marker.id,
        kind: marker.kind ?? "tree",
        label: marker.label,
        color: marker.color,
      }),
    })),
  };
}

export function pointToGeoJSON(
  position: LngLat | null | undefined,
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: position
      ? [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: position },
            properties: {},
          },
        ]
      : [],
  };
}

/**
 * MapLibre's ["get", ...] sees a key set to undefined as present, which
 * would break the `coalesce` fallbacks in the style. Drop those keys.
 */
function withoutUndefined(
  props: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined),
  );
}

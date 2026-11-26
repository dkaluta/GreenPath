import { z } from "zod";
import { CITIES, cityArea, citiesNear } from "../cities";
import { cityRefSchema } from "./city";

/*
 * Walking routes: what the browser asks for and what the server answers.
 * The router is in server/lib/routing/, the API in server/routes/routes.ts.
 * See docs/06-shade-routing.markdown.
 */

// --- Constants both sides use ------------------------------------------------

/** Walking speed for times, in metres per second (about 4.8 km/h). */
export const WALK_SPEED_MPS = 1.33;
/** One average step, in metres. */
export const STEP_LENGTH_M = 0.75;

/**
 * The first pilot city, Givatayim: where a walk starts when the person is not
 * in any supported city. The supported cities are in shared/cities.ts.
 */
export const PILOT_AREA = {
  id: CITIES[0].id,
  /** [minLng, minLat, maxLng, maxLat], with the margin around the city. */
  bbox: cityArea(CITIES[0]),
  center: CITIES[0].center,
};

/**
 * True when the point is in or near one of the supported cities. A quick
 * check by box for the browser; the server decides by the real boundary and
 * answers `outside_pilot_area` when it is not.
 */
export function isInSupportedArea(point: LatLng) {
  return citiesNear(point).length > 0;
}

// --- Request -------------------------------------------------------------------

export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** How long a free walk should be. */
export const walkUnitSchema = z.enum(["steps", "meters", "minutes"]);

/** The limits of the walk-setup counter, per unit. */
export const WALK_LIMITS = {
  minutes: { min: 10, max: 120, step: 5, initial: 30 },
  meters: { min: 500, max: 8000, step: 500, initial: 2000 },
  steps: { min: 1000, max: 12000, step: 500, initial: 3000 },
} as const satisfies Record<
  z.infer<typeof walkUnitSchema>,
  { min: number; max: number; step: number; initial: number }
>;

export const walkTargetSchema = z
  .object({ unit: walkUnitSchema, value: z.number().positive() })
  .refine(
    (target) =>
      target.value >= WALK_LIMITS[target.unit].min &&
      target.value <= WALK_LIMITS[target.unit].max,
    { message: "The walk length is out of range", path: ["value"] },
  );

export const routeRequestSchema = z.discriminatedUnion("kind", [
  /** From A to B along the shade. */
  z.object({
    kind: z.literal("destination"),
    from: latLngSchema,
    to: latLngSchema,
  }),
  /** A loop of a chosen length that starts and ends at `from`. */
  z.object({
    kind: z.literal("free"),
    from: latLngSchema,
    target: walkTargetSchema,
  }),
]);

/** A walk target in metres. */
export function targetToMeters(target: WalkTarget) {
  switch (target.unit) {
    case "meters":
      return target.value;
    case "steps":
      return target.value * STEP_LENGTH_M;
    case "minutes":
      return target.value * 60 * WALK_SPEED_MPS;
  }
}

// --- Response --------------------------------------------------------------

/** A GeoJSON LineString: [lng, lat] pairs. */
export const lineStringSchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2),
});

/**
 * What a route is good for, used for its label on the choice screen.
 * shadiest: the most shade. fastest: the shortest. balanced: in between.
 * loop: one of several free walks.
 */
export const routeKindSchema = z.enum([
  "shadiest",
  "balanced",
  "fastest",
  "loop",
]);

const share = z.number().min(0).max(1);

export const routeSchema = z.object({
  id: z.string(),
  kind: routeKindSchema,
  geometry: lineStringSchema,
  distance_m: z.number().nonnegative(),
  duration_s: z.number().nonnegative(),
  /** The share of the route's length that is shaded, 0 to 1. */
  shade: share,
  /**
   * Shade per piece of the line: segment_shade[i] is the shade between
   * geometry.coordinates[i] and [i + 1], so it has one fewer item.
   */
  segment_shade: z.array(share),
  /** Street trees within about 15 m of the way. */
  trees: z.number().int().nonnegative(),
});

export const routesResponseSchema = z.object({
  /** The city's id, e.g. "givatayim". Kept for older clients; see `city`. */
  area: z.string(),
  /** The city whose street graph the routes were found on. */
  city: cityRefSchema,
  /** Two to four routes, shadiest first. */
  routes: z.array(routeSchema).min(1).max(4),
});

export type LatLng = z.infer<typeof latLngSchema>;
export type WalkUnit = z.infer<typeof walkUnitSchema>;
export type WalkTarget = z.infer<typeof walkTargetSchema>;
export type RouteRequest = z.infer<typeof routeRequestSchema>;
export type LineString = z.infer<typeof lineStringSchema>;
export type RouteKind = z.infer<typeof routeKindSchema>;
export type Route = z.infer<typeof routeSchema>;
export type RoutesResponse = z.infer<typeof routesResponseSchema>;

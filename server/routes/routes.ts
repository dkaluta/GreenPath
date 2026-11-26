import {
  routeRequestSchema,
  type LatLng,
  type RouteRequest,
  type RoutesResponse,
} from "@shared/schemas/route";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import {
  citiesAt,
  cityGraph,
  cityRef,
  cityTrees,
  DATA_SOURCES,
  SUPPORTED_CITIES,
  type SupportedCity,
} from "../lib/routing/cities";
import {
  freeWalk,
  NoRouteError,
  OutsideAreaError,
  routeToDestination,
} from "../lib/routing/router";

/*
 * POST /api/routes - shaded walking routes in a supported city. Public.
 *
 *   { "kind": "destination", "from": {lat, lng}, "to": {lat, lng} }
 *   { "kind": "free", "from": {lat, lng}, "target": {"unit": "minutes", "value": 30} }
 *
 * Answers { area, city, routes } with up to four routes, shadiest first. The
 * city is picked from the starting point (see citiesAt). A point outside
 * every supported city gets a 422 `outside_pilot_area`. See
 * docs/06-shade-routing.markdown for how the routes are found.
 */

/** Recent answers, kept per Worker instance. Points are rounded to ~10 m. */
const cache = new Map<string, RoutesResponse>();
const CACHE_SIZE = 200;

function cacheKey(request: RouteRequest) {
  const p = (point: { lat: number; lng: number }) =>
    `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  return request.kind === "destination"
    ? `d|${p(request.from)}|${p(request.to)}`
    : `f|${p(request.from)}|${request.target.unit}|${request.target.value}`;
}

/**
 * The cities to try, best first. A walk to a destination is found on one
 * city's graph, so both ends have to be in it: the city of the start first,
 * then the destination's (each graph reaches 300 m past its city line).
 */
function candidates(request: RouteRequest): SupportedCity[] {
  const points: LatLng[] =
    request.kind === "destination"
      ? [request.from, request.to]
      : [request.from];
  const seen = new Set<string>();
  return points
    .flatMap((point) => citiesAt(point))
    .filter((city) => !seen.has(city.id) && seen.add(city.id));
}

export function outsideMessage() {
  const names = SUPPORTED_CITIES.map((city) => city.name.en);
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
      : names[0];
  return `Shaded routes are only available in ${list} for now.`;
}

export const routes = new Hono<AppEnv>().post(
  "/",
  validate("json", routeRequestSchema),
  async (c) => {
    const request = c.req.valid("json");
    const headers = { "X-Data-Sources": encodeURI(DATA_SOURCES) };
    const key = cacheKey(request);
    const hit = cache.get(key);
    if (hit) return c.json(hit, 200, headers);

    let noRoute = false;
    for (const city of candidates(request)) {
      const [graph, trees] = await Promise.all([
        cityGraph(city),
        cityTrees(city),
      ]);
      const countTrees = trees.countNear.bind(trees);
      try {
        const found =
          request.kind === "destination"
            ? routeToDestination(graph, request.from, request.to, countTrees)
            : freeWalk(graph, request.from, request.target, countTrees);
        const body: RoutesResponse = {
          area: city.id,
          city: cityRef(city),
          routes: found,
        };
        if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
        cache.set(key, body);
        return c.json(body, 200, headers);
      } catch (error) {
        // Not on this city's graph: try the next city.
        if (error instanceof OutsideAreaError) continue;
        if (error instanceof NoRouteError) {
          noRoute = true;
          continue;
        }
        throw error;
      }
    }
    if (noRoute) return fail(c, 404, "no_route", "No walking route was found.");
    // The code keeps its pilot-era name: the screens already know it.
    return fail(c, 422, "outside_pilot_area", outsideMessage());
  },
);

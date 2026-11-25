import {
  routeRequestSchema,
  type RouteRequest,
  type RoutesResponse,
} from "@shared/schemas/route";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { DATA_SOURCES, pilotGraph, pilotTrees } from "../lib/routing/pilot";
import {
  freeWalk,
  NoRouteError,
  OutsideAreaError,
  routeToDestination,
} from "../lib/routing/router";

/*
 * POST /api/routes - shaded walking routes in the pilot city. Public.
 *
 *   { "kind": "destination", "from": {lat, lng}, "to": {lat, lng} }
 *   { "kind": "free", "from": {lat, lng}, "target": {"unit": "minutes", "value": 30} }
 *
 * Answers { area, routes } with up to four routes, shadiest first. See
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

export const routes = new Hono<AppEnv>().post(
  "/",
  validate("json", routeRequestSchema),
  (c) => {
    const request = c.req.valid("json");
    const key = cacheKey(request);
    const hit = cache.get(key);
    if (hit)
      return c.json(hit, 200, { "X-Data-Sources": encodeURI(DATA_SOURCES) });

    const graph = pilotGraph();
    const trees = pilotTrees();
    const countTrees = trees.countNear.bind(trees);
    try {
      const found =
        request.kind === "destination"
          ? routeToDestination(graph, request.from, request.to, countTrees)
          : freeWalk(graph, request.from, request.target, countTrees);
      const body: RoutesResponse = { area: graph.area, routes: found };

      if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
      cache.set(key, body);
      return c.json(body, 200, { "X-Data-Sources": encodeURI(DATA_SOURCES) });
    } catch (error) {
      if (error instanceof OutsideAreaError) {
        return fail(
          c,
          422,
          "outside_pilot_area",
          "Shaded routes are only available in Givatayim for now.",
        );
      }
      if (error instanceof NoRouteError) {
        return fail(c, 404, "no_route", "No walking route was found.");
      }
      throw error;
    }
  },
);

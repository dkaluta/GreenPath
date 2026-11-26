import {
  MAX_TREES,
  treesQuerySchema,
  type TreesResponse,
} from "@shared/schemas/tree";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { validate } from "../lib/errors";
import { citiesInBox, cityRef, cityTrees } from "../lib/routing/cities";

/*
 * GET /api/trees?bbox=minLng,minLat,maxLng,maxLat - the street trees in a box
 * of at most ~2 km a side. Public.
 *
 * The trees are bundled with the Worker per city (from יער עירוני דיגיטלי,
 * ODbL), so this needs no database. A box on a city line gets the trees of
 * every city it touches, each tree once; a box outside every supported city
 * gets an empty list and no cities. The same trees are in the `trees` table
 * for joins with reports and verifications; see supabase/migrations/.
 */
export const trees = new Hono<AppEnv>().get(
  "/",
  validate("query", treesQuerySchema),
  async (c) => {
    const { bbox } = c.req.valid("query");
    const cities = citiesInBox(bbox);
    const body: TreesResponse = { trees: [], truncated: false, cities: [] };
    const seen = new Set<string>();
    for (const city of cities) {
      const found = (await cityTrees(city)).inBox(bbox);
      body.cities.push(cityRef(city));
      body.truncated ||= found.truncated;
      for (const tree of found.trees) {
        if (seen.has(tree.id)) continue;
        if (body.trees.length >= MAX_TREES) {
          body.truncated = true;
          break;
        }
        seen.add(tree.id);
        body.trees.push(tree);
      }
    }
    // The data changes only when the build runs again.
    c.header("Cache-Control", "public, max-age=3600");
    return c.json(body);
  },
);

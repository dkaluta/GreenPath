import { treesQuerySchema, type TreesResponse } from "@shared/schemas/tree";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { validate } from "../lib/errors";
import { pilotTrees } from "../lib/routing/pilot";

/*
 * GET /api/trees?bbox=minLng,minLat,maxLng,maxLat - the street trees in a box
 * of at most ~2 km a side. Public.
 *
 * For the pilot the trees are bundled with the Worker (from יער עירוני
 * דיגיטלי, ODbL), so this needs no database and answers in well under a
 * millisecond. The same trees are in the `trees` table for joins with
 * reports and verifications; see supabase/migrations/.
 */
export const trees = new Hono<AppEnv>().get(
  "/",
  validate("query", treesQuerySchema),
  (c) => {
    const { bbox } = c.req.valid("query");
    const body: TreesResponse = pilotTrees().inBox(bbox);
    // The data changes only when the pilot build runs again.
    c.header("Cache-Control", "public, max-age=3600");
    return c.json(body);
  },
);

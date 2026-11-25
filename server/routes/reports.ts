import { createReportSchema } from "@shared/schemas/report";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";

/*
 * Reports from the walk: a tree missing from the map, a tree that is gone,
 * or a damaged one. Damaged reports are flagged for the municipality and
 * kept off the map by the table itself (generated columns), so this route
 * cannot get that wrong.
 */

const COLUMNS =
  "id, kind, tree_id, lat, lng, street, send_to_municipality, show_on_map, created_at";

export const reports = new Hono<AppEnv>()

  // POST /api/reports - send one. Responds 201 with the saved report.
  .post("/", validate("json", createReportSchema), async (c) => {
    const { kind, tree_id, location, street } = c.req.valid("json");

    const { data, error } = await createAdminClient(c.env)
      .from("tree_reports")
      .insert({
        kind,
        tree_id: tree_id ?? null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        street: street ?? null,
        // From the verified token, never from the body.
        user_id: c.get("user").id,
      })
      .select(COLUMNS)
      .single();

    if (error) {
      console.error("create report failed:", error);
      return fail(c, 500, "database_error", "Could not send the report.");
    }
    return c.json(data, 201);
  });

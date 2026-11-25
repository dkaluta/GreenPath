import { createVerificationSchema } from "@shared/schemas/verification";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { ownsPhotos } from "../lib/photos";
import { createAdminClient } from "../lib/supabase";

/*
 * Recording a tree check. The photos are uploaded first through
 * POST /api/uploads; this route only stores their paths.
 */

const COLUMNS =
  "id, tree_id, lat, lng, species, street, answer, tree_photo_path, leaves_photo_path, created_at";

export const verifications = new Hono<AppEnv>()

  // POST /api/verifications - record one. Responds 201.
  .post("/", validate("json", createVerificationSchema), async (c) => {
    const input = c.req.valid("json");

    if (!ownsPhotos(c, input.tree_photo_path, input.leaves_photo_path)) {
      return fail(
        c,
        403,
        "forbidden",
        "Those photos were not uploaded by you.",
      );
    }

    // "No tree here" has nothing to photograph; drop any photos sent with it.
    const noTree = input.answer === "no_tree";

    const { data, error } = await createAdminClient(c.env)
      .from("tree_verifications")
      .insert({
        user_id: c.get("user").id,
        tree_id: input.tree_id ?? null,
        lat: input.location?.lat ?? null,
        lng: input.location?.lng ?? null,
        species: input.species ?? null,
        street: input.street ?? null,
        answer: input.answer,
        tree_photo_path: noTree ? null : (input.tree_photo_path ?? null),
        leaves_photo_path: noTree ? null : (input.leaves_photo_path ?? null),
      })
      .select(COLUMNS)
      .single();

    if (error) {
      console.error("create verification failed:", error);
      return fail(c, 500, "database_error", "Could not save your answer.");
    }
    return c.json(data, 201);
  });

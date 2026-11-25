import { z } from "zod";
import { verificationAnswerSchema } from "./verification";

/*
 * A finished walk (screen 8, the summary). The table is
 * supabase/migrations/20261125120200_walks.sql.
 */

/** What the browser sends when a walk ends. */
export const createWalkSchema = z
  .object({
    distance_m: z.number().int().min(0).max(200_000, "That walk is too long"),
    steps: z.number().int().min(0).max(500_000),
    /** 0 to 1, or null when there was no shade data. */
    shade_share: z.number().min(0).max(1).nullable(),
    started_at: z.iso.datetime({ offset: true, message: "Invalid date" }),
    ended_at: z.iso.datetime({ offset: true, message: "Invalid date" }),
  })
  .refine((walk) => Date.parse(walk.ended_at) >= Date.parse(walk.started_at), {
    message: "A walk cannot end before it starts",
    path: ["ended_at"],
  })
  // A walk is a day out, not a week. Guards against a clock that is off.
  .refine(
    (walk) =>
      Date.parse(walk.ended_at) - Date.parse(walk.started_at) <=
      24 * 60 * 60 * 1000,
    { message: "A walk cannot last more than a day", path: ["ended_at"] },
  );

/** A walk as the API returns it, with the trees checked on it. */
export const walkSchema = z.object({
  id: z.string(),
  distance_m: z.number(),
  steps: z.number(),
  shade_share: z.number().nullable(),
  started_at: z.string(),
  ended_at: z.string(),
  trees_verified: z.number(),
  trees: z.array(
    z.object({
      tree_id: z.string().nullable(),
      species: z.string().nullable(),
      answer: verificationAnswerSchema,
    }),
  ),
});

export type CreateWalkInput = z.infer<typeof createWalkSchema>;
export type Walk = z.infer<typeof walkSchema>;

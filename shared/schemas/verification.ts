import { z } from "zod";
import { pointSchema, streetSchema, treeIdSchema } from "./report";

/*
 * Checking a tree the app asked about (screens 5 to 7: stop, photograph,
 * match). The table is
 * supabase/migrations/20261125140100_tree_verifications.sql.
 */

export const VERIFICATION_ANSWERS = [
  "same",
  "different",
  "not_sure",
  "no_tree",
] as const;
export const verificationAnswerSchema = z.enum(VERIFICATION_ANSWERS);

/** A path returned by POST /api/uploads: "<user id>/<random>.<ext>". */
export const photoPathSchema = z
  .string()
  .regex(
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/,
    "Not an uploaded photo",
  );

/** What the browser sends to record a verification. */
export const createVerificationSchema = z
  .object({
    tree_id: treeIdSchema.nullish(),
    location: pointSchema.nullish(),
    /** The species the dataset expects, as a scientific name. */
    species: z.string().trim().min(1).max(200).nullish(),
    street: streetSchema.nullish(),
    answer: verificationAnswerSchema,
    tree_photo_path: photoPathSchema.nullish(),
    leaves_photo_path: photoPathSchema.nullish(),
  })
  .refine((input) => input.tree_id || input.location, {
    message: "A verification needs a tree or a location",
    path: ["location"],
  })
  .refine((input) => input.answer === "no_tree" || input.tree_photo_path, {
    message: "Please photograph the tree first",
    path: ["tree_photo_path"],
  });

/** A verification as the API returns it. */
export const verificationSchema = z.object({
  id: z.string(),
  tree_id: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  species: z.string().nullable(),
  street: z.string().nullable(),
  answer: verificationAnswerSchema,
  tree_photo_path: z.string().nullable(),
  leaves_photo_path: z.string().nullable(),
  created_at: z.string(),
});

/** GET /api/collection */
export const collectionSchema = z.object({
  /** Species confirmed with "same", most recently collected first. */
  species: z.array(
    z.object({
      species: z.string(),
      count: z.number(),
      first_collected_at: z.string(),
      /** A signed link to the person's latest photo of it, if any. */
      photo_url: z.string().nullable(),
    }),
  ),
  /** Distinct streets with a verification or a report by this person. */
  streets_helped: z.number(),
  trees_verified: z.number(),
});

export type VerificationAnswer = z.infer<typeof verificationAnswerSchema>;
export type CreateVerificationInput = z.infer<typeof createVerificationSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type Collection = z.infer<typeof collectionSchema>;

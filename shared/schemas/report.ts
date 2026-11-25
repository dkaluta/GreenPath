import { z } from "zod";

/*
 * Reports people send while walking (screen 4a, "מה רואים כאן?").
 * The table is supabase/migrations/20261125140000_tree_reports.sql.
 */

/** A tree id from the יער עירוני דיגיטלי dataset. Text, not a uuid. */
export const treeIdSchema = z
  .string()
  .trim()
  .min(1, "Missing tree id")
  .max(100, "The tree id is too long");

/** A street name, used to count the streets someone helped. */
export const streetSchema = z
  .string()
  .trim()
  .min(1)
  .max(200, "The street name is too long");

/** A point on the map. */
export const pointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const REPORT_KINDS = ["missing_from_map", "gone", "damaged"] as const;
export const reportKindSchema = z.enum(REPORT_KINDS);

/** What the browser sends to create a report. */
export const createReportSchema = z
  .object({
    kind: reportKindSchema,
    tree_id: treeIdSchema.nullish(),
    location: pointSchema.nullish(),
    street: streetSchema.nullish(),
  })
  .refine((report) => report.tree_id || report.location, {
    message: "A report needs a tree or a location",
    path: ["location"],
  })
  // A tree that is missing from the map has no id: where it stands is the
  // whole report.
  .refine((report) => report.kind !== "missing_from_map" || report.location, {
    message: "A tree missing from the map needs a location",
    path: ["location"],
  });

/** A report as the API returns it. */
export const reportSchema = z.object({
  id: z.string(),
  kind: reportKindSchema,
  tree_id: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  street: z.string().nullable(),
  /** True for damaged trees: they go to the municipality... */
  send_to_municipality: z.boolean(),
  /** ...and are not drawn on the map. */
  show_on_map: z.boolean(),
  created_at: z.string(),
});

export type ReportKind = z.infer<typeof reportKindSchema>;
export type Point = z.infer<typeof pointSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type Report = z.infer<typeof reportSchema>;

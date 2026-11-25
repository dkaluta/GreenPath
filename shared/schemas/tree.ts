import { z } from "zod";

/*
 * Street trees, as GET /api/trees returns them. The data comes from
 * יער עירוני דיגיטלי (ODbL); see docs/06-shade-routing.markdown.
 */

export const treeSchema = z.object({
  /** The יע"ד tree id: an Open Location Code of where it stands. */
  id: z.string(),
  lat: z.number(),
  lng: z.number(),
  species_he: z.string().nullable(),
  species_en: z.string().nullable(),
  genus: z.string().nullable(),
  height_m: z.number().nullable(),
  canopy_m2: z.number().nullable(),
  /**
   * survey: counted on the ground by a city (usually with the species).
   * canopy: found from the air in the national canopy map, species unknown.
   */
  source: z.enum(["survey", "canopy"]),
});

/** The largest box /api/trees answers, in degrees per side (about 2 km). */
export const MAX_TREES_BBOX_DEG = 0.02;

/** The most trees one response holds. */
export const MAX_TREES = 2000;

/** ?bbox=minLng,minLat,maxLng,maxLat */
export const treesQuerySchema = z.object({
  bbox: z
    .string()
    .transform((value) => value.split(",").map(Number))
    .refine(
      (n) =>
        n.length === 4 &&
        n.every(Number.isFinite) &&
        n[0] < n[2] &&
        n[1] < n[3] &&
        n[0] >= -180 &&
        n[2] <= 180 &&
        n[1] >= -90 &&
        n[3] <= 90,
      { message: "bbox must be minLng,minLat,maxLng,maxLat" },
    )
    .refine(
      (n) =>
        n[2] - n[0] <= MAX_TREES_BBOX_DEG && n[3] - n[1] <= MAX_TREES_BBOX_DEG,
      { message: "The box is too big; zoom in" },
    )
    .transform((n) => n as [number, number, number, number]),
});

export const treesResponseSchema = z.object({
  trees: z.array(treeSchema),
  /** True when there were more than MAX_TREES and the list was cut. */
  truncated: z.boolean(),
});

export type Tree = z.infer<typeof treeSchema>;
export type TreesResponse = z.infer<typeof treesResponseSchema>;

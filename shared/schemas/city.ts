import { z } from "zod";

/*
 * The cities with shade data, as GET /api/cities lists them and as the route
 * and tree responses name them. The cities themselves are configured in
 * shared/cities.ts; see docs/06-shade-routing.markdown.
 */

export const cityNameSchema = z.object({
  he: z.string(),
  ar: z.string(),
  en: z.string(),
});

/** Which city an answer came from. */
export const cityRefSchema = z.object({
  id: z.string(),
  name: cityNameSchema,
});

export const citySchema = cityRefSchema.extend({
  /** The municipal box: [minLng, minLat, maxLng, maxLat]. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  /** Where a walk starts when the person's own location cannot be used. */
  center: z.object({ lat: z.number(), lng: z.number() }),
  /** Street trees in the data, in and just around the city. */
  trees: z.number().int().nonnegative(),
  /** Kilometres of walkable streets in the graph. */
  street_km: z.number().nonnegative(),
  /** The length-weighted share of those streets that is shaded, 0 to 1. */
  shade: z.number().min(0).max(1),
  /** When the data was built, YYYY-MM-DD. */
  built: z.string(),
});

export const citiesResponseSchema = z.object({
  cities: z.array(citySchema),
  /** The credit line for the data, which the licences require. */
  sources: z.string(),
});

export type CityName = z.infer<typeof cityNameSchema>;
export type CityRef = z.infer<typeof cityRefSchema>;
export type City = z.infer<typeof citySchema>;
export type CitiesResponse = z.infer<typeof citiesResponseSchema>;

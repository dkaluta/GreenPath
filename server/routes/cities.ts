import type { CitiesResponse } from "@shared/schemas/city";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { DATA_SOURCES, listCities } from "../lib/routing/cities";

/*
 * GET /api/cities - the cities with shade routing, with their names in
 * Hebrew, Arabic and English, box, centre and data sizes. Public.
 * The cities are configured in shared/cities.ts.
 */
export const cities = new Hono<AppEnv>().get("/", (c) => {
  const body: CitiesResponse = { cities: listCities(), sources: DATA_SOURCES };
  c.header("Cache-Control", "public, max-age=3600");
  return c.json(body);
});

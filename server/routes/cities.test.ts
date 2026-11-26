import { CITIES } from "@shared/cities";
import { citiesResponseSchema } from "@shared/schemas/city";
import { routesResponseSchema } from "@shared/schemas/route";
import { treesResponseSchema } from "@shared/schemas/tree";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { AppEnv } from "../env";
import {
  cityAt,
  citiesAt,
  citiesInBox,
  SUPPORTED_CITIES,
} from "../lib/routing/cities";
import { cities } from "./cities";
import { routes } from "./routes";
import { trees } from "./trees";

/*
 * Picking the city from a request's location, and real routes on every
 * bundled city's graph, through the API.
 */

const app = new Hono<AppEnv>()
  .route("/api/routes", routes)
  .route("/api/trees", trees)
  .route("/api/cities", cities);

function post(body: unknown) {
  return app.request("/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Listed in shared/cities.ts, but too big to bundle (see
// server/lib/routing/cities.ts), so outside every supported city.
const JERUSALEM = { lat: 31.7767, lng: 35.2345 };
const JAFFA = { lat: 32.0505, lng: 34.757 }; // Ajami, Tel Aviv-Yafo

/** Two points in each city, a walk of one to three kilometres apart. */
const TRIPS = {
  givatayim: {
    from: { lat: 32.0647, lng: 34.8074 }, // Borochov junction
    to: { lat: 32.0776, lng: 34.8142 }, // Givatayim park
  },
  "ramat-gan": {
    from: { lat: 32.0687, lng: 34.8247 }, // the city hall
    to: { lat: 32.0838, lng: 34.8106 }, // Bialik Street
  },
  akko: {
    from: { lat: 32.9282, lng: 35.0756 }, // the new city
    to: { lat: 32.9215, lng: 35.069 }, // the old city
  },
  netanya: {
    from: { lat: 32.329, lng: 34.8565 }, // Independence Square
    to: { lat: 32.3125, lng: 34.86 }, // south along Herzl and Weizmann
  },
} as const;

/** Southern Givatayim, a few metres from Ramat Gan. */
const CITY_LINE = { lat: 32.06, lng: 34.81 };
const CITY_LINE_BOX = "34.808,32.058,34.812,32.062";

describe("SUPPORTED_CITIES", () => {
  it("is every city marked bundled in shared/cities.ts", () => {
    expect(SUPPORTED_CITIES.map((city) => city.id)).toEqual(
      CITIES.filter((city) => city.bundled).map((city) => city.id),
    );
  });
});

describe("cityAt", () => {
  it("finds each city from its own centre", () => {
    for (const city of SUPPORTED_CITIES)
      expect(cityAt(city.center)?.id).toBe(city.id);
  });

  it("finds each trip's ends in its city", () => {
    for (const [id, trip] of Object.entries(TRIPS)) {
      expect(cityAt(trip.from)?.id, id).toBe(id);
      expect(cityAt(trip.to)?.id, id).toBe(id);
    }
  });

  it("prefers the city a point is in, but knows its neighbour reaches it", () => {
    const ids = citiesAt(CITY_LINE).map((city) => city.id);
    expect(ids[0]).toBe("givatayim");
    expect(ids).toContain("ramat-gan");
  });

  it("finds nothing outside every city, or in a city that is not bundled", () => {
    expect(cityAt(JERUSALEM)).toBeNull();
    expect(cityAt(JAFFA)).toBeNull();
    expect(citiesAt({ lat: 32.0, lng: 34.6 })).toEqual([]); // the sea
  });
});

describe("citiesInBox", () => {
  it("finds both cities on a city line", () => {
    const box = CITY_LINE_BOX.split(",").map(Number) as [
      number,
      number,
      number,
      number,
    ];
    const ids = citiesInBox(box).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["givatayim", "ramat-gan"]));
  });

  it("finds one city well inside it", () => {
    expect(
      citiesInBox([35.068, 32.92, 35.072, 32.923]).map((c) => c.id),
    ).toEqual(["akko"]);
  });
});

describe("GET /api/cities", () => {
  it("lists every bundled city, named in Hebrew, Arabic and English", async () => {
    const response = await app.request("/api/cities");
    expect(response.status).toBe(200);
    const body = citiesResponseSchema.parse(await response.json());
    expect(body.cities.map((city) => city.id)).toEqual(
      SUPPORTED_CITIES.map((city) => city.id),
    );
    for (const city of body.cities) {
      expect(city.name.he).not.toBe("");
      expect(city.name.ar).not.toBe("");
      expect(city.trees).toBeGreaterThan(1000);
    }
    expect(body.sources).toContain("OpenStreetMap");
    expect(body.sources).toContain("ODbL");
    expect(body.sources).toContain("CHMv2");
  });
});

describe("POST /api/routes in each city", () => {
  for (const [id, trip] of Object.entries(TRIPS)) {
    it(`routes across ${id}`, async () => {
      const response = await post({ kind: "destination", ...trip });
      expect(response.status).toBe(200);
      const body = routesResponseSchema.parse(await response.json());
      expect(body.city.id).toBe(id);
      expect(body.area).toBe(id);
      expect(body.routes.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < body.routes.length; i++) {
        expect(body.routes[i].shade).toBeLessThanOrEqual(
          body.routes[i - 1].shade,
        );
      }
      expect(response.headers.get("X-Data-Sources")).toContain("OpenStreetMap");
    });

    it(`finds a free walk in ${id}`, async () => {
      const response = await post({
        kind: "free",
        from: trip.from,
        target: { unit: "minutes", value: 20 },
      });
      expect(response.status).toBe(200);
      const body = routesResponseSchema.parse(await response.json());
      expect(body.city.id).toBe(id);
      expect(body.routes[0].kind).toBe("loop");
    });
  }

  it("names the city in Arabic", async () => {
    const response = await post({
      kind: "free",
      from: TRIPS.akko.to,
      target: { unit: "minutes", value: 30 },
    });
    expect(response.status).toBe(200);
    const body = routesResponseSchema.parse(await response.json());
    expect(body.city.name.ar).toBe("عكا");
  });

  it("answers outside_pilot_area outside every city", async () => {
    const response = await post({
      kind: "destination",
      from: JERUSALEM,
      to: { lat: 31.78, lng: 35.23 },
    });
    expect(response.status).toBe(422);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("outside_pilot_area");
    expect(body.error.message).toContain("Akko");
    expect(body.error.message).not.toContain("Jerusalem");
  });

  it("answers outside_pilot_area in Tel Aviv-Yafo, which is not bundled", async () => {
    const response = await post({
      kind: "free",
      from: JAFFA,
      target: { unit: "minutes", value: 30 },
    });
    expect(response.status).toBe(422);
  });

  it("answers outside_pilot_area for a trip between cities far apart", async () => {
    const response = await post({
      kind: "destination",
      from: TRIPS.givatayim.from,
      to: TRIPS.akko.to,
    });
    expect(response.status).toBe(422);
  });
});

describe("GET /api/trees across cities", () => {
  it("names the city the trees came from", async () => {
    const response = await app.request(
      "/api/trees?bbox=35.068,32.920,35.072,32.923",
    );
    const body = treesResponseSchema.parse(await response.json());
    expect(body.cities.map((city) => city.id)).toEqual(["akko"]);
    expect(body.trees.length).toBeGreaterThan(0);
  });

  it("merges both cities on a city line, each tree once", async () => {
    const response = await app.request(`/api/trees?bbox=${CITY_LINE_BOX}`);
    const body = treesResponseSchema.parse(await response.json());
    expect(body.cities.length).toBeGreaterThanOrEqual(2);
    const ids = body.trees.map((tree) => tree.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is empty outside every city", async () => {
    const response = await app.request(
      "/api/trees?bbox=35.230,31.775,35.235,31.780",
    );
    const body = treesResponseSchema.parse(await response.json());
    expect(body).toEqual({ trees: [], truncated: false, cities: [] });
  });
});

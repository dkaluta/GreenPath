/*
 * The cities with shade data: one small config per city.
 *
 * Imported by the browser (to tell whether the person is somewhere we
 * cover), by the server (to pick a city's graph) and by the build script,
 * scripts/pilot/build.ts, which runs in Node and imports this file directly.
 * So it must stay plain TypeScript with no imports at all.
 *
 * To add a city: add it here, then run `npm run pilot:build -- <id>`, then
 * add its data files to server/lib/routing/cities.ts and set `bundled`.
 * See docs/06-shade-routing.markdown.
 */

export type CityConfig = {
  /** Used in file names (server/data/<id>-graph.json) and in the API. */
  id: string;
  name: { he: string; ar: string; en: string };
  /** The municipal boundary in OpenStreetMap. */
  osmRelation: number;
  /** The municipal boundary's box: [minLng, minLat, maxLng, maxLat]. */
  bbox: readonly [number, number, number, number];
  /** Where a walk starts when we cannot use the person's location. */
  center: { lat: number; lng: number };
  /**
   * Whether the Worker carries this city's data, so it can be routed in.
   * Tel Aviv-Yafo and Jerusalem can be built but are too big to bundle yet.
   */
  bundled: boolean;
};

/**
 * The graph and trees cover the city's box plus this much around it (about
 * 300 m), so routes can use the streets at the edge.
 */
export const CITY_MARGIN_DEG = { lng: 0.0032, lat: 0.0027 };

export const CITIES = [
  {
    id: "givatayim",
    name: { he: "גבעתיים", ar: "جفعاتايم", en: "Givatayim" },
    osmRelation: 1382923,
    bbox: [34.7979, 32.0584, 34.8207, 32.0819],
    center: { lat: 32.0712, lng: 34.8105 },
    bundled: true,
  },
  {
    id: "ramat-gan",
    name: { he: "רמת גן", ar: "رمات غان", en: "Ramat Gan" },
    osmRelation: 1382493,
    bbox: [34.7991, 32.0361, 34.8546, 32.1056],
    center: { lat: 32.0687, lng: 34.8247 },
    bundled: true,
  },
  {
    id: "tel-aviv-yafo",
    name: { he: "תל אביב–יפו", ar: "تل أبيب – يافا", en: "Tel Aviv-Yafo" },
    osmRelation: 1382494,
    bbox: [34.7391, 32.0293, 34.8523, 32.147],
    center: { lat: 32.0853, lng: 34.7818 },
    bundled: false,
  },
  {
    id: "akko",
    name: { he: "עכו", ar: "عكا", en: "Akko (Acre)" },
    osmRelation: 1387962,
    bbox: [35.0619, 32.8864, 35.1122, 32.9485],
    center: { lat: 32.9282, lng: 35.0756 },
    bundled: true,
  },
  {
    id: "netanya",
    name: { he: "נתניה", ar: "نتانيا", en: "Netanya" },
    osmRelation: 1383391,
    bbox: [34.8247, 32.2549, 34.896, 32.3605],
    center: { lat: 32.3286, lng: 34.8566 },
    bundled: true,
  },
  {
    id: "jerusalem",
    name: { he: "ירושלים", ar: "القدس", en: "Jerusalem" },
    osmRelation: 1381350,
    bbox: [35.0852, 31.7096, 35.2651, 31.8827],
    center: { lat: 31.7806, lng: 35.217 },
    bundled: false,
  },
] as const satisfies readonly CityConfig[];

export type CityId = (typeof CITIES)[number]["id"];

/** The area a city's data covers: its box plus the margin. */
export function cityArea(city: CityConfig): [number, number, number, number] {
  const [minLng, minLat, maxLng, maxLat] = city.bbox;
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  return [
    round(minLng - CITY_MARGIN_DEG.lng),
    round(minLat - CITY_MARGIN_DEG.lat),
    round(maxLng + CITY_MARGIN_DEG.lng),
    round(maxLat + CITY_MARGIN_DEG.lat),
  ];
}

export function findCityConfig(id: string): CityConfig | undefined {
  return CITIES.find((city) => city.id === id);
}

/**
 * The bundled cities whose covered area contains the point. A quick check
 * by box, good enough for the browser; the server decides by the real boundary.
 */
export function citiesNear(point: { lat: number; lng: number }) {
  return CITIES.filter((city) => {
    if (!city.bundled) return false;
    const [minLng, minLat, maxLng, maxLat] = cityArea(city);
    return (
      point.lng >= minLng &&
      point.lng <= maxLng &&
      point.lat >= minLat &&
      point.lat <= maxLat
    );
  });
}

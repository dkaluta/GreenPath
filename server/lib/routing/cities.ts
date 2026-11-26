import { CITIES, type CityConfig, type CityId } from "@shared/cities";
import type { City, CityRef } from "@shared/schemas/city";
import type { LatLng } from "@shared/schemas/route";
import index from "../../data/cities.json";
import { Graph, M_PER_DEG_LAT, type RawGraph } from "./graph";
import { TreeIndex, type RawTreeRow } from "./trees";

/*
 * The supported cities and their data.
 *
 * Each city's graph and trees are built by `npm run pilot:build` (see
 * scripts/pilot/build.ts) into server/data/<id>-graph.json and
 * <id>-trees.json. They are bundled with the Worker, but each as its own
 * chunk that is imported, parsed and kept only when a request first needs
 * that city: a Worker instance that only ever sees Givatayim never pays for
 * Tel Aviv. server/data/cities.json (small, always loaded) has every city's
 * boundary, which is how a point is matched to a city.
 */

/**
 * The JSON text of each bundled city's files, imported on first use.
 *
 * Tel Aviv-Yafo and Jerusalem are in shared/cities.ts and can be built, but
 * are not bundled: with them the Worker is ~12 MB compressed (the limit is
 * 3 MB free, 10 MB paid) and their parsed data needs more than a Worker's
 * 128 MB of memory. docs/06-shade-routing.markdown has the numbers and the
 * plan for them.
 */
const FILES: Partial<
  Record<CityId, { graph: () => Promise<string>; trees: () => Promise<string> }>
> = {
  givatayim: {
    graph: () => text(import("../../data/givatayim-graph.json?raw")),
    trees: () => text(import("../../data/givatayim-trees.json?raw")),
  },
  "ramat-gan": {
    graph: () => text(import("../../data/ramat-gan-graph.json?raw")),
    trees: () => text(import("../../data/ramat-gan-trees.json?raw")),
  },
  akko: {
    graph: () => text(import("../../data/akko-graph.json?raw")),
    trees: () => text(import("../../data/akko-trees.json?raw")),
  },
  netanya: {
    graph: () => text(import("../../data/netanya-graph.json?raw")),
    trees: () => text(import("../../data/netanya-trees.json?raw")),
  },
};

async function text(module: Promise<{ default: string }>) {
  return (await module).default;
}

/** The credit line every response built from this data should carry. */
export const DATA_SOURCES = index.sources;

type IndexEntry = {
  built: string;
  boundary: number[][][][];
  trees: number;
  km: number;
  shaded: number;
};

const entries = index.cities as Record<string, IndexEntry | undefined>;

/** How far outside its boundary a city's streets reach (see the build). */
export const CITY_REACH_M = 300;

export type SupportedCity = CityConfig & { boundary: number[][][][] };

/** The bundled cities that have data, in the order of shared/cities.ts. */
export const SUPPORTED_CITIES: SupportedCity[] = CITIES.flatMap((city) => {
  const entry = entries[city.id];
  return entry && city.bundled && FILES[city.id]
    ? [{ ...city, boundary: entry.boundary }]
    : [];
});

export function cityRef(city: CityConfig): CityRef {
  return { id: city.id, name: city.name };
}

/** What GET /api/cities lists. */
export function listCities(): City[] {
  return SUPPORTED_CITIES.map((city) => {
    const entry = entries[city.id]!;
    return {
      ...cityRef(city),
      bbox: [...city.bbox],
      center: city.center,
      trees: entry.trees,
      street_km: entry.km,
      shade: entry.shaded,
      built: entry.built,
    };
  });
}

// --- Which city a point is in ----------------------------------------------------

/** Even-odd over every ring of every polygon, so holes are left out. */
export function insideBoundary(point: LatLng, boundary: number[][][][]) {
  let inside = false;
  for (const polygon of boundary) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (
          yi > point.lat !== yj > point.lat &&
          point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
        )
          inside = !inside;
      }
    }
  }
  return inside;
}

/** Metres from the point to the boundary line; 0 inside. */
export function metresFromBoundary(point: LatLng, boundary: number[][][][]) {
  if (insideBoundary(point, boundary)) return 0;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((point.lat * Math.PI) / 180);
  let best = Infinity;
  for (const polygon of boundary) {
    for (const ring of polygon) {
      for (let i = 0; i + 1 < ring.length; i++) {
        const x = (point.lng - ring[i][0]) * mPerDegLng;
        const y = (point.lat - ring[i][1]) * M_PER_DEG_LAT;
        const dx = (ring[i + 1][0] - ring[i][0]) * mPerDegLng;
        const dy = (ring[i + 1][1] - ring[i][1]) * M_PER_DEG_LAT;
        const len2 = dx * dx + dy * dy;
        const t =
          len2 > 0 ? Math.max(0, Math.min(1, (x * dx + y * dy) / len2)) : 0;
        best = Math.min(best, Math.hypot(x - t * dx, y - t * dy));
      }
    }
  }
  return best;
}

/**
 * The cities whose data covers the point, best first: the city it is in,
 * then cities whose streets reach it (within 300 m of their boundary),
 * nearest first. Empty when the point is outside every supported city.
 */
export function citiesAt(point: LatLng): SupportedCity[] {
  return SUPPORTED_CITIES.flatMap((city) => {
    const [minLng, minLat, maxLng, maxLat] = city.bbox;
    // About 300 m of slack around the box, before the exact test.
    const pad = 0.004;
    if (
      point.lng < minLng - pad ||
      point.lng > maxLng + pad ||
      point.lat < minLat - pad ||
      point.lat > maxLat + pad
    )
      return [];
    const metres = metresFromBoundary(point, city.boundary);
    return metres <= CITY_REACH_M ? [{ city, metres }] : [];
  })
    .sort((a, b) => a.metres - b.metres)
    .map(({ city }) => city);
}

/** The city a point is in or next to, or null outside them all. */
export function cityAt(point: LatLng): SupportedCity | null {
  return citiesAt(point)[0] ?? null;
}

/**
 * The cities whose boundary (plus the trees' margin) touches a box, for the
 * map's tree layer: a map view on a city line shows both cities' trees.
 */
export function citiesInBox([minLng, minLat, maxLng, maxLat]: [
  number,
  number,
  number,
  number,
]): SupportedCity[] {
  const centre = { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
  return SUPPORTED_CITIES.filter((city) => {
    const [cMinLng, cMinLat, cMaxLng, cMaxLat] = city.bbox;
    if (
      maxLng < cMinLng ||
      minLng > cMaxLng ||
      maxLat < cMinLat ||
      minLat > cMaxLat
    )
      return false;
    // The box touches the city when a boundary corner is inside the box,
    // when a box corner is inside the city, or when the box is within reach.
    for (const polygon of city.boundary)
      for (const ring of polygon)
        for (const [lng, lat] of ring)
          if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat)
            return true;
    const corners = [
      { lng: minLng, lat: minLat },
      { lng: minLng, lat: maxLat },
      { lng: maxLng, lat: minLat },
      { lng: maxLng, lat: maxLat },
      centre,
    ];
    return corners.some(
      (corner) => metresFromBoundary(corner, city.boundary) <= 150,
    );
  });
}

// --- Loading a city's data --------------------------------------------------------

function files(city: CityConfig) {
  const found = FILES[city.id as CityId];
  if (!found) throw new Error(`No bundled data for ${city.id}`);
  return found;
}

const graphs = new Map<string, Promise<Graph>>();
const trees = new Map<string, Promise<TreeIndex>>();

/** The city's street graph, parsed on first use and kept for the instance. */
export function cityGraph(city: CityConfig): Promise<Graph> {
  let graph = graphs.get(city.id);
  if (!graph) {
    graph = files(city)
      .graph()
      .then((json) => new Graph(JSON.parse(json) as RawGraph));
    graph.catch(() => graphs.delete(city.id));
    graphs.set(city.id, graph);
  }
  return graph;
}

/** The city's street trees, parsed on first use and kept for the instance. */
export function cityTrees(city: CityConfig): Promise<TreeIndex> {
  let found = trees.get(city.id);
  if (!found) {
    found = files(city)
      .trees()
      .then(
        (json) =>
          new TreeIndex((JSON.parse(json) as { trees: RawTreeRow[] }).trees),
      );
    found.catch(() => trees.delete(city.id));
    trees.set(city.id, found);
  }
  return found;
}

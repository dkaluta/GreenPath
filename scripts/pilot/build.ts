/*
 * Builds a city's shade-scored street graph and tree list.
 *
 *     npm run pilot:build                  # every city in shared/cities.ts
 *     npm run pilot:build -- ramat-gan     # one or more cities, by id
 *     npm run pilot:build -- givatayim --bbox-only
 *
 * The cities (names, OSM boundary relation, box and centre) are configured in
 * shared/cities.ts. Runs in Node (24+, which runs TypeScript directly), never
 * on Workers. For each city it:
 *
 *   1. fetches the city's boundary (Nominatim) and its walkable streets
 *      (Overpass API) from OpenStreetMap,
 *   2. cuts the city's trees out of the national יער עירוני דיגיטלי CSV
 *      (1.6 GB, downloaded once into scripts/pilot/.cache/; one pass over the
 *      file serves every city being built),
 *   3. reads the CHMv2 canopy-height raster for the area straight from AWS,
 *      with HTTP range requests (only the 512 px tiles it needs),
 *   4. scores every street segment from 0 (full sun) to 1 (full shade),
 *   5. keeps the streets within 300 m of the boundary and the trees within
 *      150 m of it (with --bbox-only: everything in the city's box plus those
 *      margins, which is how the Givatayim pilot was first built), and
 *   6. writes server/data/<id>-graph.json, server/data/<id>-trees.json,
 *      supabase/seed-trees/<id>.sql and the city's entry in
 *      server/data/cities.json (its boundary and sizes).
 *
 * Everything downloaded is kept in scripts/pilot/.cache/ (git-ignored), so a
 * second run is offline and quick. Delete a file there to fetch it again.
 *
 * Data licences: OpenStreetMap and יער עירוני דיגיטלי are ODbL, CHMv2 is
 * CC BY 4.0. The outputs are a derived database and are offered under ODbL.
 * See docs/06-shade-routing.markdown.
 */

import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { fromUrl } from "geotiff";
import { CITIES, cityArea, type CityConfig } from "../../shared/cities.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CACHE = join(HERE, ".cache");
mkdirSync(CACHE, { recursive: true });

// --- The city being built ------------------------------------------------------

type Box = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/*
 * The steps below work on one city at a time, and `useCity` points them at
 * it. This is a script, so module state is simpler than passing a context
 * through every function.
 */
/** The city's municipal box. */
let CITY: Box;
/** About 300 m around it, so routes can use the streets at the edge. */
let AREA: Box;
/** This city's downloads: its OSM streets, boundary and cut of the CSV. */
let CITY_CACHE: string;
let M_PER_DEG_LNG: number;

function useCity(city: CityConfig) {
  const [minLng, minLat, maxLng, maxLat] = city.bbox;
  CITY = { minLng, minLat, maxLng, maxLat };
  AREA = toBox(cityArea(city));
  CITY_CACHE = join(CACHE, city.id);
  mkdirSync(CITY_CACHE, { recursive: true });
  M_PER_DEG_LNG = mPerDegLng(AREA);
}

function toBox([minLng, minLat, maxLng, maxLat]: readonly number[]): Box {
  return { minLng, minLat, maxLng, maxLat };
}

function mPerDegLng(box: Box) {
  return 111_320 * Math.cos((((box.minLat + box.maxLat) / 2) * Math.PI) / 180);
}

/** Streets are kept this far outside the boundary. */
const STREET_MARGIN_M = 300;
/** Trees are kept this far outside the boundary. */
const TREE_MARGIN_M = 150;

const TREES_CSV_URL =
  "https://s3.eu-west-2.wasabisys.com/opentreebase-public/processed/trees/trees.csv";
const CHM_BASE =
  "https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/dinov3_global_chm_v2_ml3/chm";
/**
 * Tried in turn: the public Overpass servers are often busy. Set
 * OVERPASS_URL to try another server first.
 */
const OVERPASS = [
  ...(process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : []),
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const NOMINATIM = "https://nominatim.openstreetmap.org/lookup";
const USER_AGENT = "GreenPath-pilot-build/0.1 (shade routing research)";

// --- Shade model ------------------------------------------------------------

/** A CHMv2 pixel at least this tall (metres) counts as shade-giving canopy. */
const CANOPY_MIN_HEIGHT_M = 3;
/** Sample every this many metres along a segment. */
const SAMPLE_STEP_M = 2;
/** On a street, sample the pavement this far to either side of the centre line. */
const PAVEMENT_OFFSET_M = 4;
/** Crown radius when the tree data has no canopy size. */
const DEFAULT_CROWN_RADIUS_M = 2.5;

// ---------------------------------------------------------------------------

type LngLat = [number, number];
type Tree = {
  id: string;
  lng: number;
  lat: number;
  speciesHe: string | null;
  speciesEn: string | null;
  genus: string | null;
  heightM: number | null;
  canopyM2: number | null;
  source: "survey" | "canopy";
};

const M_PER_DEG_LAT = 111_320;

function inBox(lng: number, lat: number, box: Box) {
  return (
    lng >= box.minLng &&
    lng <= box.maxLng &&
    lat >= box.minLat &&
    lat <= box.maxLat
  );
}

function distanceM(a: LngLat, b: LngLat) {
  const dx = (a[0] - b[0]) * M_PER_DEG_LNG;
  const dy = (a[1] - b[1]) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// --- 1. Streets from OpenStreetMap -------------------------------------------

type OsmWay = { id: number; nodes: number[]; tags: Record<string, string> };
type OsmNode = { id: number; lat: number; lon: number };

const WALKABLE = new Set([
  "footway",
  "path",
  "pedestrian",
  "living_street",
  "residential",
  "service",
  "unclassified",
  "tertiary",
  "tertiary_link",
  "secondary",
  "secondary_link",
  "primary",
  "primary_link",
  "steps",
  "track",
  "cycleway",
  "corridor",
  "road",
]);

/** Ways that are footpaths themselves, so the pavement is the centre line. */
const FOOTPATHS = new Set([
  "footway",
  "path",
  "pedestrian",
  "steps",
  "corridor",
  "cycleway",
  "track",
]);

/** Size of one OSM download tile, in degrees (about 2 km). */
const OSM_TILE_DEG = 0.02;

/** One Overpass query for the streets in a box, retried across servers. */
async function fetchOverpass(box: string): Promise<string> {
  const query = `[out:json][timeout:110];way["highway"](${box});(._;>;);out body;`;
  for (let attempt = 0, wait = 10_000; ; attempt++) {
    const server = OVERPASS[attempt % OVERPASS.length];
    let status: number | string;
    try {
      const response = await fetch(server, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(120_000),
      });
      const text = await response.text();
      // A busy server can answer 200 with an error in place of the data.
      if (response.ok && text.startsWith("{") && text.includes('"elements"'))
        return text;
      status = response.status;
    } catch (error) {
      status = String(error);
    }
    if (attempt >= 29) throw new Error(`Overpass failed: ${status}`);
    console.log(`  ${server}: ${status}; waiting ${wait / 1000}s`);
    await sleep(wait);
    if (attempt % OVERPASS.length === OVERPASS.length - 1)
      wait = Math.min(wait * 2, 120_000);
  }
}

async function fetchOsm(): Promise<{
  ways: OsmWay[];
  nodes: Map<number, OsmNode>;
}> {
  const file = join(CITY_CACHE, "osm.json");
  if (!existsSync(file)) {
    // One query for a whole city is too much for the public Overpass servers
    // when they are busy (502/504 for minutes on end), so the area is
    // fetched in tiles, each cached on its own so a stopped build resumes
    // where it left off, then merged.
    const tilesDir = join(CITY_CACHE, "osm-tiles");
    mkdirSync(tilesDir, { recursive: true });
    const cols = Math.max(
      1,
      Math.ceil((AREA.maxLng - AREA.minLng) / OSM_TILE_DEG),
    );
    const rows = Math.max(
      1,
      Math.ceil((AREA.maxLat - AREA.minLat) / OSM_TILE_DEG),
    );
    const width = (AREA.maxLng - AREA.minLng) / cols;
    const height = (AREA.maxLat - AREA.minLat) / rows;
    const elements = new Map<string, unknown>();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = join(tilesDir, `${row}-${col}.json`);
        if (!existsSync(tile)) {
          const minLat = AREA.minLat + row * height;
          const minLng = AREA.minLng + col * width;
          const box = `${minLat},${minLng},${minLat + height},${minLng + width}`;
          console.log(`OSM tile ${row * cols + col + 1} of ${rows * cols}`);
          await writeFile(tile, await fetchOverpass(box));
        }
        const data = JSON.parse(await readFile(tile, "utf8")) as {
          elements: { type: string; id: number }[];
        };
        // A way crossing a tile edge comes back in both tiles: keep one.
        for (const element of data.elements)
          elements.set(`${element.type}/${element.id}`, element);
      }
    }
    await writeFile(file, JSON.stringify({ elements: [...elements.values()] }));
  }
  const data = JSON.parse(await readFile(file, "utf8")) as {
    elements: (({ type: "way" } & OsmWay) | ({ type: "node" } & OsmNode))[];
  };
  const nodes = new Map<number, OsmNode>();
  const ways: OsmWay[] = [];
  for (const element of data.elements) {
    if (element.type === "node") nodes.set(element.id, element);
    else if (element.type === "way") ways.push(element);
  }
  return { ways, nodes };
}

/**
 * The municipal boundary, as GeoJSON MultiPolygon coordinates, simplified by
 * Nominatim to about 10 m (0.0001°). Small enough to ship with the server,
 * which uses it to tell which city a point is in.
 */
type Boundary = LngLat[][][];

async function fetchBoundary(city: CityConfig): Promise<Boundary> {
  const file = join(CITY_CACHE, "boundary.json");
  if (!existsSync(file)) {
    console.log(`Fetching the boundary of OSM relation ${city.osmRelation}...`);
    const url = `${NOMINATIM}?format=json&osm_ids=R${city.osmRelation}&polygon_geojson=1&polygon_threshold=0.0001`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) throw new Error(`Nominatim failed: ${response.status}`);
    await writeFile(file, await response.text());
    await sleep(1100); // Nominatim's limit is one request a second.
  }
  const [place] = JSON.parse(await readFile(file, "utf8")) as {
    geojson: { type: string; coordinates: unknown };
  }[];
  if (!place) throw new Error(`No boundary for relation ${city.osmRelation}`);
  const polygons =
    place.geojson.type === "Polygon"
      ? [place.geojson.coordinates as LngLat[][]]
      : place.geojson.type === "MultiPolygon"
        ? (place.geojson.coordinates as LngLat[][][])
        : null;
  if (!polygons) throw new Error(`The boundary is a ${place.geojson.type}`);
  return polygons.map((rings) =>
    rings.map((ring) =>
      ring.map(([lng, lat]) => [
        Math.round(lng * 1e5) / 1e5,
        Math.round(lat * 1e5) / 1e5,
      ]),
    ),
  );
}

/** Even-odd test over every ring, so holes are left out. */
function insideBoundary(lng: number, lat: number, boundary: Boundary) {
  let inside = false;
  for (const polygon of boundary) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (
          yi > lat !== yj > lat &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
        )
          inside = !inside;
      }
    }
  }
  return inside;
}

/** Metres from a point to the boundary: 0 inside it. */
function metresFromBoundary(lng: number, lat: number, boundary: Boundary) {
  if (insideBoundary(lng, lat, boundary)) return 0;
  let best = Infinity;
  for (const polygon of boundary) {
    for (const ring of polygon) {
      for (let i = 0; i + 1 < ring.length; i++) {
        const [ax, ay] = ring[i];
        const [bx, by] = ring[i + 1];
        const x = (lng - ax) * M_PER_DEG_LNG;
        const y = (lat - ay) * M_PER_DEG_LAT;
        const dx = (bx - ax) * M_PER_DEG_LNG;
        const dy = (by - ay) * M_PER_DEG_LAT;
        const len2 = dx * dx + dy * dy;
        const t =
          len2 > 0 ? Math.max(0, Math.min(1, (x * dx + y * dy) / len2)) : 0;
        best = Math.min(best, Math.hypot(x - t * dx, y - t * dy));
      }
    }
  }
  return best;
}

function isWalkable(tags: Record<string, string>) {
  const highway = tags.highway;
  if (!highway) return false;
  if (tags.foot === "no" || tags.foot === "use_sidepath") return false;
  if (tags.area === "yes") return false;
  const footYes = tags.foot === "yes" || tags.foot === "designated";
  if ((tags.access === "private" || tags.access === "no") && !footYes)
    return false;
  if (highway === "cycleway" && !footYes) return false;
  return WALKABLE.has(highway) || footYes;
}

// --- 2. Trees from יער עירוני דיגיטלי ----------------------------------------

/** Splits one CSV line, honouring "quoted, fields". */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

function num(value: string | undefined) {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Each city's trees (in its AREA), from the per-city cache, or else from one
 * pass over the national CSV for all the cities not cached yet.
 */
async function loadTrees(cities: CityConfig[]): Promise<Map<string, Tree[]>> {
  const result = new Map<string, Tree[]>();
  const missing: CityConfig[] = [];
  for (const city of cities) {
    const cached = join(CACHE, city.id, "trees-area.json");
    if (existsSync(cached))
      result.set(city.id, JSON.parse(await readFile(cached, "utf8")) as Tree[]);
    else missing.push(city);
  }
  if (missing.length > 0) {
    const read = await readTreesCsv(
      missing.map((city) => toBox(cityArea(city))),
    );
    for (const [k, city] of missing.entries()) {
      mkdirSync(join(CACHE, city.id), { recursive: true });
      await writeFile(
        join(CACHE, city.id, "trees-area.json"),
        JSON.stringify(read[k]),
      );
      result.set(city.id, read[k]);
    }
  }
  return result;
}

/** The trees in each box, one list per box, from one pass over the CSV. */
async function readTreesCsv(boxes: Box[]): Promise<Tree[][]> {
  const csv = join(CACHE, "trees.csv");
  if (!existsSync(csv)) {
    throw new Error(
      `Missing ${csv}.\nDownload it once (1.6 GB):\n  curl -o ${csv} ${TREES_CSV_URL}`,
    );
  }
  console.log("Reading the national tree CSV (a minute or two)...");
  const lines = createInterface({
    input: createReadStream(csv, "utf8"),
    crlfDelay: Infinity,
  });
  let header: string[] | null = null;
  let pending = "";
  const lists: Tree[][] = boxes.map(() => []);
  for await (const raw of lines) {
    // A quoted field may contain a newline: keep reading until quotes balance.
    const line = pending ? `${pending}\n${raw}` : raw;
    if ((line.match(/"/g)?.length ?? 0) % 2 === 1) {
      pending = line;
      continue;
    }
    pending = "";
    const cells = splitCsvLine(line);
    if (!header) {
      header = cells;
      continue;
    }
    const col = (name: string) => cells[header!.indexOf(name)];
    const lng = Number(col("location-x"));
    const lat = Number(col("location-y"));
    const wanted = boxes.flatMap((box, k) => (inBox(lng, lat, box) ? [k] : []));
    if (wanted.length === 0) continue;
    const canopyDiameter = num(col("attributes-canopy-diameter"));
    const tree: Tree = {
      id: col("meta-tree-id") || `idx-${col("idx")}`,
      lng,
      lat,
      speciesHe: col("attributes-species-clean-he") || null,
      speciesEn: col("attributes-species-clean-en") || null,
      genus: col("attributes-genus") || null,
      heightM: num(col("attributes-height")),
      canopyM2:
        num(col("attributes-canopy-area")) ??
        (canopyDiameter ? Math.PI * (canopyDiameter / 2) ** 2 : null),
      source:
        col("meta-collection-type") === "חישה מרחוק" ? "canopy" : "survey",
    };
    for (const k of wanted) lists[k].push(tree);
  }
  return lists.map((trees) => {
    // The same tree can come from a survey and from the canopy map; keep one
    // per id, preferring the survey (it has the species).
    const byId = new Map<string, Tree>();
    for (const tree of trees) {
      const existing = byId.get(tree.id);
      if (
        !existing ||
        (existing.source === "canopy" && tree.source === "survey")
      ) {
        byId.set(tree.id, tree);
      }
    }
    return [...byId.values()];
  });
}

// --- 3. Canopy height from CHMv2 ----------------------------------------------

/*
 * CHMv2 is stored as one Cloud-Optimised GeoTIFF per zoom-10 Web Mercator tile
 * (named by its quadkey): 32768 x 32768 pixels of about 1.2 m, 8-bit heights
 * in metres. geotiff.js reads just the window we need with HTTP range
 * requests; the window is then cached in .cache/chm/ for offline reruns.
 */

const EARTH = 20037508.342789244;
const CHM_ZOOM = 10;
const CHM_SIZE = 32768;

function toMercator(lng: number, lat: number): [number, number] {
  const x = (lng * EARTH) / 180;
  const y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * (EARTH / Math.PI);
  return [x, y];
}

/** Global pixel coordinates at CHMv2's resolution. */
function toChmPixel(lng: number, lat: number): [number, number] {
  const [x, y] = toMercator(lng, lat);
  const worldPx = CHM_SIZE * 2 ** CHM_ZOOM;
  return [
    ((x + EARTH) / (2 * EARTH)) * worldPx,
    ((EARTH - y) / (2 * EARTH)) * worldPx,
  ];
}

function quadkey(tx: number, ty: number, zoom: number) {
  let key = "";
  for (let i = zoom; i > 0; i--) {
    const mask = 1 << (i - 1);
    key += String((tx & mask ? 1 : 0) + (ty & mask ? 2 : 0));
  }
  return key;
}

/** A canopy-height grid covering AREA, at CHMv2's ~1.2 m pixels. */
class CanopyGrid {
  readonly x0: number;
  readonly y0: number;
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(x0: number, y0: number, width: number, height: number) {
    this.x0 = x0;
    this.y0 = y0;
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }

  /** Height in metres under a point, or 0 outside the grid / no data. */
  at(lng: number, lat: number) {
    const [px, py] = toChmPixel(lng, lat);
    const x = Math.floor(px) - this.x0;
    const y = Math.floor(py) - this.y0;
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    const value = this.data[y * this.width + x];
    return value >= 250 ? 0 : value; // 255 is "no data"
  }
}

/** Reads one window of a CHMv2 tile over HTTP range requests. */
async function readChmWindow(
  key: string,
  tx: number,
  ty: number,
  window: [number, number, number, number],
): Promise<Uint8Array> {
  const tileM = (2 * EARTH) / 2 ** CHM_ZOOM;
  const tiff = await fromUrl(`${CHM_BASE}/${key}.tif`);
  const image = await tiff.getImage();
  // Check the tile is where its quadkey says, so pixels line up.
  const [originX, originY] = image.getOrigin();
  const expectX = tx * tileM - EARTH;
  const expectY = EARTH - ty * tileM;
  if (
    image.getWidth() !== CHM_SIZE ||
    Math.abs(originX - expectX) > 1 ||
    Math.abs(originY - expectY) > 1
  ) {
    throw new Error(`CHMv2 tile ${key} is not laid out as expected`);
  }
  const raster = await image.readRasters({
    window,
    samples: [0],
    interleave: true,
  });
  return new Uint8Array(raster as unknown as ArrayLike<number>);
}

/** Retries a network read a few times, since S3 sometimes drops a connection. */
async function withRetries<T>(what: string, read: () => Promise<T>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= 5 || (error as Error).message.includes("not laid out"))
        throw error;
      const wait = 5 * attempt;
      console.log(
        `  ${what}: ${(error as Error).message}; retrying in ${wait}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    }
  }
}

async function loadCanopy(): Promise<CanopyGrid> {
  const [minX, minY] = toChmPixel(AREA.minLng, AREA.maxLat).map(Math.floor);
  const [maxX, maxY] = toChmPixel(AREA.maxLng, AREA.minLat).map(Math.ceil);
  const grid = new CanopyGrid(minX, minY, maxX - minX, maxY - minY);

  for (
    let ty = Math.floor(minY / CHM_SIZE);
    ty <= Math.floor((maxY - 1) / CHM_SIZE);
    ty++
  ) {
    for (
      let tx = Math.floor(minX / CHM_SIZE);
      tx <= Math.floor((maxX - 1) / CHM_SIZE);
      tx++
    ) {
      const key = quadkey(tx, ty, CHM_ZOOM);
      // The part of this tile inside AREA, in the tile's own pixels.
      const left = Math.max(minX, tx * CHM_SIZE) - tx * CHM_SIZE;
      const top = Math.max(minY, ty * CHM_SIZE) - ty * CHM_SIZE;
      const right = Math.min(maxX, (tx + 1) * CHM_SIZE) - tx * CHM_SIZE;
      const bottom = Math.min(maxY, (ty + 1) * CHM_SIZE) - ty * CHM_SIZE;
      const width = right - left;
      const cacheFile = join(
        CACHE,
        "chm",
        `${key}-${left}-${top}-${right}-${bottom}.bin`,
      );

      let pixels: Uint8Array;
      if (existsSync(cacheFile)) {
        pixels = new Uint8Array(await readFile(cacheFile));
      } else {
        console.log(
          `Reading CHMv2 tile ${key} (${width} x ${bottom - top} px)...`,
        );
        pixels = await withRetries(`CHMv2 tile ${key}`, () =>
          readChmWindow(key, tx, ty, [left, top, right, bottom]),
        );
        mkdirSync(dirname(cacheFile), { recursive: true });
        await writeFile(cacheFile, pixels);
      }

      for (let row = 0; row < bottom - top; row++) {
        const y = ty * CHM_SIZE + top + row - grid.y0;
        for (let col = 0; col < width; col++) {
          const x = tx * CHM_SIZE + left + col - grid.x0;
          grid.data[y * grid.width + x] = pixels[row * width + col];
        }
      }
    }
  }
  return grid;
}

// --- 4. Scoring -------------------------------------------------------------

/** A grid of trees for quick "is this point under a crown?" lookups. */
class TreeIndex {
  private cells = new Map<string, { lng: number; lat: number; r: number }[]>();
  private readonly cellM = 20;

  constructor(trees: Tree[]) {
    for (const tree of trees) {
      const r = tree.canopyM2
        ? Math.sqrt(tree.canopyM2 / Math.PI)
        : DEFAULT_CROWN_RADIUS_M;
      const key = this.key(tree.lng, tree.lat);
      const list = this.cells.get(key) ?? [];
      list.push({ lng: tree.lng, lat: tree.lat, r: Math.min(r, 10) });
      this.cells.set(key, list);
    }
  }

  private key(lng: number, lat: number, dx = 0, dy = 0) {
    const cx = Math.floor((lng * M_PER_DEG_LNG) / this.cellM) + dx;
    const cy = Math.floor((lat * M_PER_DEG_LAT) / this.cellM) + dy;
    return `${cx}:${cy}`;
  }

  covers(lng: number, lat: number) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const tree of this.cells.get(this.key(lng, lat, dx, dy)) ?? []) {
          if (distanceM([lng, lat], [tree.lng, tree.lat]) <= tree.r)
            return true;
        }
      }
    }
    return false;
  }
}

function shadeOf(
  a: LngLat,
  b: LngLat,
  footpath: boolean,
  canopy: CanopyGrid,
  trees: TreeIndex,
) {
  const length = distanceM(a, b);
  const steps = Math.max(1, Math.round(length / SAMPLE_STEP_M));
  // Unit normal to the segment, in degrees, for the pavement offsets.
  const dxM = (b[0] - a[0]) * M_PER_DEG_LNG;
  const dyM = (b[1] - a[1]) * M_PER_DEG_LAT;
  const norm = Math.hypot(dxM, dyM) || 1;
  const nLng = -dyM / norm / M_PER_DEG_LNG;
  const nLat = dxM / norm / M_PER_DEG_LAT;
  const offsets = footpath ? [0] : [-PAVEMENT_OFFSET_M, PAVEMENT_OFFSET_M];

  let shaded = 0;
  let total = 0;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const lng = a[0] + (b[0] - a[0]) * t;
    const lat = a[1] + (b[1] - a[1]) * t;
    for (const offset of offsets) {
      const pLng = lng + nLng * offset;
      const pLat = lat + nLat * offset;
      total++;
      if (
        canopy.at(pLng, pLat) >= CANOPY_MIN_HEIGHT_M ||
        trees.covers(pLng, pLat)
      )
        shaded++;
    }
  }
  return shaded / total;
}

// --- 5. Build and write ---------------------------------------------------------

const SOURCES =
  "© OpenStreetMap contributors (ODbL); יער עירוני דיגיטלי (ODbL); CHMv2 © Meta and WRI (CC BY 4.0)";

/** What server/data/cities.json holds for each city. */
type CityIndexEntry = {
  built: string;
  /** GeoJSON MultiPolygon coordinates of the municipal boundary. */
  boundary: Boundary;
  trees: number;
  nodes: number;
  edges: number;
  km: number;
  shaded: number;
  graphBytes: number;
  treesBytes: number;
  graphGzipBytes: number;
  treesGzipBytes: number;
  buildSeconds: number;
};

async function buildCity(
  city: CityConfig,
  trees: Tree[],
  bboxOnly: boolean,
): Promise<CityIndexEntry> {
  const started = performance.now();
  useCity(city);
  console.log(`\n== ${city.name.en} (${city.id})`);
  const boundary = await fetchBoundary(city);
  const { ways, nodes } = await fetchOsm();
  const canopy = await loadCanopy();
  const treeIndex = new TreeIndex(trees);
  console.log(`${ways.length} OSM ways, ${trees.length} trees in the area`);

  /** Is an OSM node close enough to the city to keep? Memoised per node. */
  const nearCity = new Map<number, boolean>();
  const keepNode = (osmId: number) => {
    if (bboxOnly) return true;
    let near = nearCity.get(osmId);
    if (near === undefined) {
      const node = nodes.get(osmId)!;
      near =
        metresFromBoundary(node.lon, node.lat, boundary) <= STREET_MARGIN_M;
      nearCity.set(osmId, near);
    }
    return near;
  };

  // Graph nodes are the OSM nodes of walkable ways; edges are consecutive pairs.
  const nodeIndex = new Map<number, number>();
  const coords: LngLat[] = [];
  const edges: { a: number; b: number; length: number; shade: number }[] = [];
  const indexOf = (osmId: number) => {
    let i = nodeIndex.get(osmId);
    if (i === undefined) {
      const node = nodes.get(osmId)!;
      i = coords.length;
      coords.push([node.lon, node.lat]);
      nodeIndex.set(osmId, i);
    }
    return i;
  };
  for (const way of ways) {
    if (!isWalkable(way.tags)) continue;
    const footpath =
      FOOTPATHS.has(way.tags.highway) || way.tags.footway !== undefined;
    for (let k = 0; k + 1 < way.nodes.length; k++) {
      if (!nodes.has(way.nodes[k]) || !nodes.has(way.nodes[k + 1])) continue;
      // A piece is kept when either end is near the city.
      if (!keepNode(way.nodes[k]) && !keepNode(way.nodes[k + 1])) continue;
      const a = indexOf(way.nodes[k]);
      const b = indexOf(way.nodes[k + 1]);
      if (a === b) continue;
      const length = distanceM(coords[a], coords[b]);
      edges.push({
        a,
        b,
        length,
        shade: shadeOf(coords[a], coords[b], footpath, canopy, treeIndex),
      });
    }
  }

  // Keep only the largest connected piece, so nobody gets snapped onto an
  // island path that cannot reach anything.
  const parent = coords.map((_, i) => i);
  const find = (i: number): number =>
    parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (const edge of edges) parent[find(edge.a)] = find(edge.b);
  const sizes = new Map<number, number>();
  for (let i = 0; i < coords.length; i++)
    sizes.set(find(i), (sizes.get(find(i)) ?? 0) + 1);
  const biggest = [...sizes.entries()].sort((x, y) => y[1] - x[1])[0][0];
  const keep = coords.map((_, i) => find(i) === biggest);
  const remap = new Map<number, number>();
  const outCoords: LngLat[] = [];
  coords.forEach((c, i) => {
    if (keep[i]) {
      remap.set(i, outCoords.length);
      outCoords.push(c);
    }
  });
  const outEdges = edges.filter((e) => keep[e.a] && keep[e.b]);

  const origin: LngLat = [AREA.minLng, AREA.minLat];
  const graph = {
    version: 1,
    area: city.id,
    bbox: [AREA.minLng, AREA.minLat, AREA.maxLng, AREA.maxLat],
    city: [CITY.minLng, CITY.minLat, CITY.maxLng, CITY.maxLat],
    origin,
    built: new Date().toISOString().slice(0, 10),
    sources: SOURCES,
    // Node i is at origin + (nodes[2i], nodes[2i+1]) millionths of a degree.
    nodes: outCoords.flatMap(([lng, lat]) => [
      Math.round((lng - origin[0]) * 1e6),
      Math.round((lat - origin[1]) * 1e6),
    ]),
    // Edge j is (a, b, length in decimetres, shade in percent).
    edges: outEdges.flatMap((e) => [
      remap.get(e.a)!,
      remap.get(e.b)!,
      Math.round(e.length * 10),
      Math.round(e.shade * 100),
    ]),
  };
  const dataDir = join(ROOT, "server", "data");
  mkdirSync(dataDir, { recursive: true });
  const graphJson = JSON.stringify(graph);
  await writeFile(join(dataDir, `${city.id}-graph.json`), graphJson);

  // Trees in the city itself (plus a little margin) for the map and the API.
  const MARGIN = 0.0015;
  const cityTrees = trees.filter((t) =>
    bboxOnly
      ? inBox(t.lng, t.lat, {
          minLng: CITY.minLng - MARGIN,
          minLat: CITY.minLat - MARGIN,
          maxLng: CITY.maxLng + MARGIN,
          maxLat: CITY.maxLat + MARGIN,
        })
      : metresFromBoundary(t.lng, t.lat, boundary) <= TREE_MARGIN_M,
  );
  cityTrees.sort((x, y) => x.lat - y.lat || x.lng - y.lng);
  const treesJson = JSON.stringify({
    version: 1,
    sources: "יער עירוני דיגיטלי (ODbL)",
    // [id, lng, lat, species he, species en, genus, height m, canopy m², source]
    trees: cityTrees.map((t) => [
      t.id,
      Number(t.lng.toFixed(6)),
      Number(t.lat.toFixed(6)),
      t.speciesHe,
      t.speciesEn,
      t.genus,
      t.heightM,
      t.canopyM2 === null ? null : Math.round(t.canopyM2 * 10) / 10,
      t.source,
    ]),
  });
  await writeFile(join(dataDir, `${city.id}-trees.json`), treesJson);

  // The same trees as SQL, for the `trees` table (see supabase/migrations/).
  const sql = (v: string | number | null) =>
    v === null
      ? "null"
      : typeof v === "number"
        ? String(v)
        : `'${v.replace(/'/g, "''")}'`;
  const rows = cityTrees.map(
    (t) =>
      `(${[t.id, t.lng, t.lat, t.speciesHe, t.speciesEn, t.genus, t.heightM, t.canopyM2 === null ? null : Math.round(t.canopyM2 * 10) / 10, t.source, city.id].map(sql).join(", ")})`,
  );
  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += 1000) {
    chunks.push(
      `insert into public.trees (id, lng, lat, species_he, species_en, genus, height_m, canopy_m2, source, area) values\n${rows.slice(i, i + 1000).join(",\n")}\non conflict (id) do nothing;`,
    );
  }
  const seedDir = join(ROOT, "supabase", "seed-trees");
  mkdirSync(seedDir, { recursive: true });
  await writeFile(
    join(seedDir, `${city.id}.sql`),
    `-- Generated by scripts/pilot/build.ts. Do not edit by hand.\n-- Source: יער עירוני דיגיטלי (ODbL).\n\n${chunks.join("\n\n")}\n`,
  );

  const shaded = outEdges.reduce((s, e) => s + e.shade * e.length, 0);
  const total = outEdges.reduce((s, e) => s + e.length, 0);
  const entry: CityIndexEntry = {
    built: graph.built,
    boundary,
    trees: cityTrees.length,
    nodes: outCoords.length,
    edges: outEdges.length,
    km: Math.round(total / 100) / 10,
    shaded: Math.round((shaded / total) * 100) / 100,
    graphBytes: Buffer.byteLength(graphJson),
    treesBytes: Buffer.byteLength(treesJson),
    graphGzipBytes: gzipSync(graphJson).length,
    treesGzipBytes: gzipSync(treesJson).length,
    buildSeconds: Math.round((performance.now() - started) / 100) / 10,
  };
  console.log(
    `Graph: ${entry.nodes} nodes, ${entry.edges} edges, ${entry.km} km, ` +
      `${Math.round(entry.shaded * 100)}% shaded overall. ${entry.trees} trees written.\n` +
      `Files: graph ${kb(entry.graphBytes)} (${kb(entry.graphGzipBytes)} gzipped), ` +
      `trees ${kb(entry.treesBytes)} (${kb(entry.treesGzipBytes)} gzipped). ` +
      `${entry.buildSeconds}s (not counting the pass over the CSV).`,
  );
  return entry;
}

function kb(bytes: number) {
  return `${Math.round(bytes / 1024).toLocaleString("en")} KB`;
}

async function main() {
  const args = process.argv.slice(2);
  const bboxOnly = args.includes("--bbox-only");
  const ids = args.filter((arg) => !arg.startsWith("--"));
  const cities: CityConfig[] = ids.length
    ? ids.map((id) => {
        const city = CITIES.find((c) => c.id === id);
        if (!city) {
          throw new Error(
            `Unknown city "${id}". Known: ${CITIES.map((c) => c.id).join(", ")}`,
          );
        }
        return city;
      })
    : [...CITIES];

  const csvStarted = performance.now();
  const trees = await loadTrees(cities);
  console.log(
    `Trees for ${cities.length} cities in ${Math.round((performance.now() - csvStarted) / 1000)}s`,
  );

  const indexFile = join(ROOT, "server", "data", "cities.json");
  const index = existsSync(indexFile)
    ? (JSON.parse(await readFile(indexFile, "utf8")) as {
        cities: Record<string, CityIndexEntry>;
      })
    : { cities: {} };
  for (const city of cities) {
    index.cities[city.id] = await buildCity(
      city,
      trees.get(city.id)!,
      bboxOnly,
    );
  }
  // Keep the order of shared/cities.ts, and only cities still listed there.
  const ordered: Record<string, CityIndexEntry> = {};
  for (const city of CITIES)
    if (index.cities[city.id]) ordered[city.id] = index.cities[city.id];
  await writeFile(
    indexFile,
    JSON.stringify({ version: 1, sources: SOURCES, cities: ordered }),
  );
}

await main();

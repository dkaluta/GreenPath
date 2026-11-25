/*
 * Builds the pilot city's shade-scored street graph and tree list.
 *
 *     npm run pilot:build
 *
 * Runs in Node (24+, which runs TypeScript directly), never on Workers. It:
 *
 *   1. fetches the walkable streets around Givatayim from OpenStreetMap
 *      (Overpass API),
 *   2. cuts the pilot area's trees out of the national יער עירוני דיגיטלי
 *      CSV (1.6 GB, downloaded once into scripts/pilot/.cache/),
 *   3. reads the CHMv2 canopy-height raster for the area straight from AWS,
 *      with HTTP range requests (only the 512 px tiles it needs),
 *   4. scores every street segment from 0 (full sun) to 1 (full shade), and
 *   5. writes server/data/givatayim-graph.json, server/data/givatayim-trees.json
 *      and supabase/seed-trees.sql.
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
import { inflateSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CACHE = join(HERE, ".cache");
mkdirSync(CACHE, { recursive: true });

// --- The pilot area -------------------------------------------------------

/** Givatayim's municipal boundary (OSM relation 1382923), as a bbox. */
const CITY = {
  minLng: 34.7979,
  minLat: 32.0584,
  maxLng: 34.8207,
  maxLat: 32.0819,
};
/** About 300 m around it, so routes can use the streets at the edge. */
const AREA = {
  minLng: 34.7947,
  minLat: 32.0557,
  maxLng: 34.8239,
  maxLat: 32.0846,
};

const TREES_CSV_URL =
  "https://s3.eu-west-2.wasabisys.com/opentreebase-public/processed/trees/trees.csv";
const CHM_BASE =
  "https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/dinov3_global_chm_v2_ml3/chm";
const OVERPASS = "https://overpass-api.de/api/interpreter";
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
const M_PER_DEG_LNG =
  111_320 * Math.cos((((AREA.minLat + AREA.maxLat) / 2) * Math.PI) / 180);

function inBox(lng: number, lat: number, box: typeof AREA) {
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

async function fetchOsm(): Promise<{
  ways: OsmWay[];
  nodes: Map<number, OsmNode>;
}> {
  const file = join(CACHE, "osm.json");
  if (!existsSync(file)) {
    const box = `${AREA.minLat},${AREA.minLng},${AREA.maxLat},${AREA.maxLng}`;
    const query = `[out:json][timeout:120];way["highway"](${box});(._;>;);out body;`;
    for (let attempt = 0, wait = 5000; ; attempt++, wait *= 2) {
      console.log(`Fetching OSM streets (attempt ${attempt + 1})...`);
      const response = await fetch(OVERPASS, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (response.ok) {
        await writeFile(file, await response.text());
        break;
      }
      if (attempt >= 5) throw new Error(`Overpass failed: ${response.status}`);
      console.log(
        `  Overpass said ${response.status}; waiting ${wait / 1000}s`,
      );
      await sleep(wait);
    }
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

async function loadTrees(): Promise<Tree[]> {
  const cached = join(CACHE, "trees-area.json");
  if (existsSync(cached))
    return JSON.parse(await readFile(cached, "utf8")) as Tree[];

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
  const trees: Tree[] = [];
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
    if (!inBox(lng, lat, AREA)) continue;
    const canopyDiameter = num(col("attributes-canopy-diameter"));
    trees.push({
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
    });
  }
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
  const unique = [...byId.values()];
  await writeFile(cached, JSON.stringify(unique));
  return unique;
}

// --- 3. Canopy height from CHMv2 ----------------------------------------------

/*
 * CHMv2 is stored as one GeoTIFF per zoom-10 Web Mercator tile (named by its
 * quadkey): 32768 x 32768 pixels of about 1.2 m, 8-bit heights in metres,
 * in 512 px Deflate-compressed tiles. That is simple enough to read with
 * node:zlib, without a GeoTIFF library.
 */

const EARTH = 20037508.342789244;
const CHM_ZOOM = 10;
const CHM_SIZE = 32768;
const CHM_BLOCK = 512;

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

async function fetchRange(url: string, start: number, length: number) {
  const cacheFile = join(
    CACHE,
    "chm",
    `${url.split("/").pop()}-${start}-${length}.bin`,
  );
  if (existsSync(cacheFile)) return await readFile(cacheFile);
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { Range: `bytes=${start}-${start + length - 1}` },
    });
    if (response.status === 206 || response.status === 200) {
      const buffer = Buffer.from(await response.arrayBuffer());
      mkdirSync(dirname(cacheFile), { recursive: true });
      await writeFile(cacheFile, buffer);
      return buffer;
    }
    if (attempt >= 3) throw new Error(`${url}: HTTP ${response.status}`);
    await sleep(2000 * (attempt + 1));
  }
}

type TiffIndex = { offsets: number[]; counts: number[]; across: number };

async function readTiffIndex(url: string): Promise<TiffIndex> {
  const head = await fetchRange(url, 0, 1 << 16);
  if (head.toString("latin1", 0, 2) !== "II")
    throw new Error("Expected a little-endian TIFF");
  const ifd = head.readUInt32LE(4);
  const entries = head.readUInt16LE(ifd);
  const tags = new Map<
    number,
    { type: number; count: number; value: number }
  >();
  for (let i = 0; i < entries; i++) {
    const at = ifd + 2 + i * 12;
    const type = head.readUInt16LE(at + 2);
    const count = head.readUInt32LE(at + 4);
    const value =
      type === 3 && count === 1
        ? head.readUInt16LE(at + 8)
        : head.readUInt32LE(at + 8);
    tags.set(head.readUInt16LE(at), { type, count, value });
  }
  const width = tags.get(256)!.value;
  const block = tags.get(322)!.value;
  const compression = tags.get(259)!.value;
  const bits = tags.get(258)!.value;
  if (
    width !== CHM_SIZE ||
    block !== CHM_BLOCK ||
    compression !== 8 ||
    bits !== 8
  ) {
    throw new Error(`Unexpected CHMv2 layout in ${url}`);
  }
  if (tags.get(317)?.value && tags.get(317)!.value !== 1) {
    throw new Error("CHMv2 uses a predictor this reader does not handle");
  }
  const offsetsTag = tags.get(324)!;
  const countsTag = tags.get(325)!;
  const readLongs = async (tag: { count: number; value: number }) => {
    const buffer = await fetchRange(url, tag.value, tag.count * 4);
    return Array.from({ length: tag.count }, (_, i) =>
      buffer.readUInt32LE(i * 4),
    );
  };
  return {
    offsets: await readLongs(offsetsTag),
    counts: await readLongs(countsTag),
    across: CHM_SIZE / CHM_BLOCK,
  };
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

async function loadCanopy(): Promise<CanopyGrid> {
  const [minX, minY] = toChmPixel(AREA.minLng, AREA.maxLat).map(Math.floor);
  const [maxX, maxY] = toChmPixel(AREA.maxLng, AREA.minLat).map(Math.ceil);
  const grid = new CanopyGrid(minX, minY, maxX - minX, maxY - minY);
  const indexes = new Map<string, TiffIndex>();

  const firstBlockX = Math.floor(minX / CHM_BLOCK);
  const firstBlockY = Math.floor(minY / CHM_BLOCK);
  const lastBlockX = Math.floor((maxX - 1) / CHM_BLOCK);
  const lastBlockY = Math.floor((maxY - 1) / CHM_BLOCK);
  console.log(
    `Reading CHMv2: ${(lastBlockX - firstBlockX + 1) * (lastBlockY - firstBlockY + 1)} blocks...`,
  );
  for (let by = firstBlockY; by <= lastBlockY; by++) {
    for (let bx = firstBlockX; bx <= lastBlockX; bx++) {
      const gx = bx * CHM_BLOCK;
      const gy = by * CHM_BLOCK;
      const tileX = Math.floor(gx / CHM_SIZE);
      const tileY = Math.floor(gy / CHM_SIZE);
      const url = `${CHM_BASE}/${quadkey(tileX, tileY, CHM_ZOOM)}.tif`;
      let index = indexes.get(url);
      if (!index) {
        index = await readTiffIndex(url);
        indexes.set(url, index);
      }
      const localBx = (gx - tileX * CHM_SIZE) / CHM_BLOCK;
      const localBy = (gy - tileY * CHM_SIZE) / CHM_BLOCK;
      const i = localBy * index.across + localBx;
      if (!index.counts[i]) continue; // an empty block, all zero
      const pixels = inflateSync(
        await fetchRange(url, index.offsets[i], index.counts[i]),
      );
      for (let row = 0; row < CHM_BLOCK; row++) {
        const y = gy + row - grid.y0;
        if (y < 0 || y >= grid.height) continue;
        for (let col = 0; col < CHM_BLOCK; col++) {
          const x = gx + col - grid.x0;
          if (x < 0 || x >= grid.width) continue;
          grid.data[y * grid.width + x] = pixels[row * CHM_BLOCK + col];
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

async function main() {
  const { ways, nodes } = await fetchOsm();
  const trees = await loadTrees();
  const canopy = await loadCanopy();
  const treeIndex = new TreeIndex(trees);
  console.log(`${ways.length} OSM ways, ${trees.length} trees in the area`);

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
    area: "givatayim",
    bbox: [AREA.minLng, AREA.minLat, AREA.maxLng, AREA.maxLat],
    city: [CITY.minLng, CITY.minLat, CITY.maxLng, CITY.maxLat],
    origin,
    built: new Date().toISOString().slice(0, 10),
    sources:
      "© OpenStreetMap contributors (ODbL); יער עירוני דיגיטלי (ODbL); CHMv2 © Meta and WRI (CC BY 4.0)",
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
  await writeFile(join(dataDir, "givatayim-graph.json"), JSON.stringify(graph));

  // Trees in the city itself (plus a little margin) for the map and the API.
  const MARGIN = 0.0015;
  const cityTrees = trees.filter((t) =>
    inBox(t.lng, t.lat, {
      minLng: CITY.minLng - MARGIN,
      minLat: CITY.minLat - MARGIN,
      maxLng: CITY.maxLng + MARGIN,
      maxLat: CITY.maxLat + MARGIN,
    }),
  );
  cityTrees.sort((x, y) => x.lat - y.lat || x.lng - y.lng);
  await writeFile(
    join(dataDir, "givatayim-trees.json"),
    JSON.stringify({
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
    }),
  );

  // The same trees as SQL, for the `trees` table (see supabase/migrations/).
  const sql = (v: string | number | null) =>
    v === null
      ? "null"
      : typeof v === "number"
        ? String(v)
        : `'${v.replace(/'/g, "''")}'`;
  const rows = cityTrees.map(
    (t) =>
      `(${[t.id, t.lng, t.lat, t.speciesHe, t.speciesEn, t.genus, t.heightM, t.canopyM2 === null ? null : Math.round(t.canopyM2 * 10) / 10, t.source, "givatayim"].map(sql).join(", ")})`,
  );
  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += 1000) {
    chunks.push(
      `insert into public.trees (id, lng, lat, species_he, species_en, genus, height_m, canopy_m2, source, area) values\n${rows.slice(i, i + 1000).join(",\n")}\non conflict (id) do nothing;`,
    );
  }
  await writeFile(
    join(ROOT, "supabase", "seed-trees.sql"),
    `-- Generated by scripts/pilot/build.ts. Do not edit by hand.\n-- Source: יער עירוני דיגיטלי (ODbL).\n\n${chunks.join("\n\n")}\n`,
  );

  const shaded = outEdges.reduce((s, e) => s + e.shade * e.length, 0);
  const total = outEdges.reduce((s, e) => s + e.length, 0);
  console.log(
    `Graph: ${outCoords.length} nodes, ${outEdges.length} edges, ${(total / 1000).toFixed(1)} km, ` +
      `${Math.round((shaded / total) * 100)}% shaded overall. ${cityTrees.length} trees written.`,
  );
}

await main();

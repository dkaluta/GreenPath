import { MAX_TREES, type Tree } from "@shared/schemas/tree";
import type { Route } from "@shared/schemas/route";
import { M_PER_DEG_LAT } from "./graph";

/*
 * The pilot city's street trees, in memory, built by scripts/pilot/build.ts
 * into server/data/givatayim-trees.json. A grid of cells makes "trees in this
 * box" and "trees near this route" quick.
 */

/** [id, lng, lat, species he, species en, genus, height m, canopy m², source] */
export type RawTreeRow = [
  string,
  number,
  number,
  string | null,
  string | null,
  string | null,
  number | null,
  number | null,
  "survey" | "canopy",
];

const CELL_DEG = 0.001; // about 100 m
/** A tree counts as "on the way" within this distance of the route. */
const NEAR_ROUTE_M = 15;

export class TreeIndex {
  private readonly cells = new Map<string, RawTreeRow[]>();
  readonly count: number;

  constructor(rows: RawTreeRow[]) {
    this.count = rows.length;
    for (const row of rows) {
      const key = cellKey(
        Math.floor(row[1] / CELL_DEG),
        Math.floor(row[2] / CELL_DEG),
      );
      const list = this.cells.get(key);
      if (list) list.push(row);
      else this.cells.set(key, [row]);
    }
  }

  /** Trees in [minLng, minLat, maxLng, maxLat], at most MAX_TREES. */
  inBox([minLng, minLat, maxLng, maxLat]: [number, number, number, number]) {
    const trees: Tree[] = [];
    let truncated = false;
    for (
      let cx = Math.floor(minLng / CELL_DEG);
      cx <= Math.floor(maxLng / CELL_DEG);
      cx++
    ) {
      for (
        let cy = Math.floor(minLat / CELL_DEG);
        cy <= Math.floor(maxLat / CELL_DEG);
        cy++
      ) {
        for (const row of this.cells.get(cellKey(cx, cy)) ?? []) {
          if (
            row[1] < minLng ||
            row[1] > maxLng ||
            row[2] < minLat ||
            row[2] > maxLat
          )
            continue;
          if (trees.length >= MAX_TREES) {
            truncated = true;
            break;
          }
          trees.push(toTree(row));
        }
      }
    }
    return { trees, truncated };
  }

  /** How many different trees stand within 15 m of the route's line. */
  countNear(route: Route) {
    const coords = route.geometry.coordinates;
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((coords[0][1] * Math.PI) / 180);
    const seen = new Set<string>();
    for (let i = 0; i + 1 < coords.length; i++) {
      const [ax, ay] = coords[i];
      const [bx, by] = coords[i + 1];
      const pad = NEAR_ROUTE_M / M_PER_DEG_LAT;
      for (
        let cx = Math.floor((Math.min(ax, bx) - pad) / CELL_DEG);
        cx <= Math.floor((Math.max(ax, bx) + pad) / CELL_DEG);
        cx++
      ) {
        for (
          let cy = Math.floor((Math.min(ay, by) - pad) / CELL_DEG);
          cy <= Math.floor((Math.max(ay, by) + pad) / CELL_DEG);
          cy++
        ) {
          for (const row of this.cells.get(cellKey(cx, cy)) ?? []) {
            if (seen.has(row[0])) continue;
            const d = pointToSegmentM(
              row[1],
              row[2],
              ax,
              ay,
              bx,
              by,
              mPerDegLng,
            );
            if (d <= NEAR_ROUTE_M) seen.add(row[0]);
          }
        }
      }
    }
    return seen.size;
  }
}

function cellKey(cx: number, cy: number) {
  return `${cx}:${cy}`;
}

function toTree(row: RawTreeRow): Tree {
  return {
    id: row[0],
    lng: row[1],
    lat: row[2],
    species_he: row[3],
    species_en: row[4],
    genus: row[5],
    height_m: row[6],
    canopy_m2: row[7],
    source: row[8],
  };
}

/** Distance in metres from point P to segment AB (all lng, lat). */
export function pointToSegmentM(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  mPerDegLng: number,
) {
  const x = (px - ax) * mPerDegLng;
  const y = (py - ay) * M_PER_DEG_LAT;
  const dx = (bx - ax) * mPerDegLng;
  const dy = (by - ay) * M_PER_DEG_LAT;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (x * dx + y * dy) / len2)) : 0;
  return Math.hypot(x - t * dx, y - t * dy);
}

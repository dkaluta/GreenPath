import {
  targetToMeters,
  WALK_SPEED_MPS,
  type LatLng,
  type Route,
  type RouteKind,
  type WalkTarget,
} from "@shared/schemas/route";
import type { Graph } from "./graph";

/*
 * Shade-aware walking routes on the pilot graph.
 *
 * The cost of walking a street piece is
 *
 *     length × (1 + β × (1 − shade)) × penalty
 *
 * β = 0 is the plain shortest route; a bigger β walks further to stay in the
 * shade. `penalty` makes already-used streets dearer, so alternatives and
 * loops find other streets. A* with straight-line distance as the guide is
 * exact, because no street costs less than its length.
 */

/** The β values tried for a route to a destination, sun-tolerant to shade-loving. */
export const DESTINATION_BETAS = [0, 1, 3, 8];
/** Two routes sharing more than this share of their length are the same. */
const SAME_ROUTE_OVERLAP = 0.85;
/** How much a used street costs on the next try. */
const ALTERNATIVE_PENALTY = 1.6;
const LOOP_PENALTY = 4;
/** β for free walks: they are for pleasure, so lean hard on shade. */
const LOOP_BETA = 4;
/** Number of directions a free walk tries. */
const LOOP_BEARINGS = 6;
/** A free walk may be this much shorter or longer than asked. */
const LOOP_TOLERANCE = 0.2;

export class OutsideAreaError extends Error {
  constructor() {
    super("The point is outside the pilot area.");
    this.name = "OutsideAreaError";
  }
}

export class NoRouteError extends Error {
  constructor() {
    super("No walking route was found.");
    this.name = "NoRouteError";
  }
}

/** A path through the graph: its nodes and the edges between them. */
export type Path = { nodes: number[]; edges: number[] };

/** The cost of one edge. Exported for tests. */
export function edgeCost(
  length: number,
  shade: number,
  beta: number,
  penalty = 1,
) {
  return length * (1 + beta * (1 - shade)) * penalty;
}

/**
 * The cheapest path from `start` to `goal`, or null if they are not
 * connected. `penalty` (per edge, default 1) multiplies the cost.
 */
export function findPath(
  graph: Graph,
  start: number,
  goal: number,
  beta: number,
  penalty?: Float32Array,
): Path | null {
  if (start === goal) return { nodes: [start], edges: [] };
  const n = graph.size;
  const cost = new Float64Array(n).fill(Infinity);
  const viaEdge = new Int32Array(n).fill(-1);
  const viaNode = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const heap = new MinHeap(n);

  cost[start] = 0;
  heap.push(start, graph.distance(start, goal));
  while (heap.size > 0) {
    const node = heap.pop();
    if (done[node]) continue;
    if (node === goal) break;
    done[node] = 1;
    for (let arc = graph.first[node]; arc < graph.first[node + 1]; arc++) {
      const next = graph.to[arc];
      if (done[next]) continue;
      const e = graph.edge[arc];
      const c =
        cost[node] +
        edgeCost(
          graph.length[e],
          graph.shade[e],
          beta,
          penalty ? penalty[e] : 1,
        );
      if (c < cost[next]) {
        cost[next] = c;
        viaEdge[next] = e;
        viaNode[next] = node;
        heap.push(next, c + graph.distance(next, goal));
      }
    }
  }
  if (cost[goal] === Infinity) return null;

  const nodes = [goal];
  const edges: number[] = [];
  for (let at = goal; at !== start; at = viaNode[at]) {
    edges.push(viaEdge[at]);
    nodes.push(viaNode[at]);
  }
  return { nodes: nodes.reverse(), edges: edges.reverse() };
}

/** Length and length-weighted shade of a path. */
export function measure(graph: Graph, path: Path) {
  let length = 0;
  let shaded = 0;
  for (const e of path.edges) {
    length += graph.length[e];
    shaded += graph.length[e] * graph.shade[e];
  }
  return { length, shade: length > 0 ? shaded / length : 0 };
}

/** The share of the shorter path's length that the two paths share. */
export function overlap(graph: Graph, a: Path, b: Path) {
  const inA = new Set(a.edges);
  let shared = 0;
  for (const e of new Set(b.edges)) if (inA.has(e)) shared += graph.length[e];
  const shorter = Math.min(measure(graph, a).length, measure(graph, b).length);
  return shorter > 0 ? shared / shorter : 1;
}

function snap(graph: Graph, point: LatLng) {
  const node = graph.nearest(point.lng, point.lat);
  if (node < 0) throw new OutsideAreaError();
  return node;
}

function addPenalty(penalty: Float32Array, path: Path, factor: number) {
  for (const e of path.edges) penalty[e] *= factor;
}

function isNew(graph: Graph, found: Path[], path: Path, limit: number) {
  return found.every((other) => overlap(graph, other, path) <= limit);
}

/** Two to four routes from A to B, shadiest first. */
export function routeToDestination(
  graph: Graph,
  from: LatLng,
  to: LatLng,
  countTrees: (route: Route) => number = () => 0,
): Route[] {
  const start = snap(graph, from);
  const goal = snap(graph, to);
  const found: Path[] = [];

  for (const beta of DESTINATION_BETAS) {
    const path = findPath(graph, start, goal, beta);
    if (
      path &&
      path.edges.length > 0 &&
      isNew(graph, found, path, SAME_ROUTE_OVERLAP)
    ) {
      found.push(path);
    }
  }
  if (found.length === 0) throw new NoRouteError();

  // Short trips often give the same street for every β. Make the used
  // streets dearer and look again, so there is something to choose from.
  const penalty = new Float32Array(graph.edgeCount).fill(1);
  for (let tries = 0; found.length < 2 && tries < 3; tries++) {
    for (const path of found) addPenalty(penalty, path, ALTERNATIVE_PENALTY);
    const path = findPath(graph, start, goal, 2, penalty);
    if (path && isNew(graph, found, path, SAME_ROUTE_OVERLAP)) found.push(path);
  }

  const measured = found.map((path) => ({ path, ...measure(graph, path) }));
  const fastest = measured.reduce((a, b) => (b.length < a.length ? b : a));
  measured.sort((a, b) => b.shade - a.shade || a.length - b.length);

  return measured.map((m, i) => {
    const kind: RouteKind =
      i === 0 ? "shadiest" : m === fastest ? "fastest" : "balanced";
    return toRoute(graph, m.path, kind, `d${i}`, countTrees);
  });
}

/**
 * Up to three loops of about the target length that start and end at
 * `from`, shadiest first.
 *
 * Each loop is a triangle: out to a point in one direction, across to a
 * second point, and home, with the streets already walked made dearer so
 * the way back is different. Six directions are tried.
 */
export function freeWalk(
  graph: Graph,
  from: LatLng,
  target: WalkTarget,
  countTrees: (route: Route) => number = () => 0,
): Route[] {
  const start = snap(graph, from);
  const wanted = targetToMeters(target);
  const candidates: { path: Path; length: number; shade: number }[] = [];

  for (let k = 0; k < LOOP_BEARINGS; k++) {
    const bearing = (2 * Math.PI * k) / LOOP_BEARINGS;
    // Streets are not straight lines: about 1.2 × the straight distance.
    let side = wanted / 3.6;
    for (let attempt = 0; attempt < 2; attempt++) {
      const loop = triangle(graph, start, bearing, side);
      if (!loop) break;
      const m = measure(graph, loop);
      const ratio = wanted / m.length;
      if (Math.abs(1 - ratio) <= LOOP_TOLERANCE) {
        candidates.push({ path: loop, ...m });
        break;
      }
      side *= ratio;
    }
  }

  // The closest to the asked length wins ties; then drop near-copies.
  candidates.sort(
    (a, b) =>
      b.shade - a.shade ||
      Math.abs(a.length - wanted) - Math.abs(b.length - wanted),
  );
  const chosen: Path[] = [];
  for (const c of candidates) {
    if (chosen.length < 3 && isNew(graph, chosen, c.path, 0.6))
      chosen.push(c.path);
  }
  if (chosen.length === 0) throw new NoRouteError();
  return chosen.map((path, i) =>
    toRoute(graph, path, "loop", `w${i}`, countTrees),
  );
}

function triangle(graph: Graph, start: number, bearing: number, side: number) {
  const corner = (angle: number) => {
    const lng = graph.lng[start] + (Math.sin(angle) * side) / graph.mPerDegLng;
    const lat = graph.lat[start] + (Math.cos(angle) * side) / 111_320;
    return graph.nearest(lng, lat, Math.max(150, side / 3));
  };
  const a = corner(bearing);
  const b = corner(bearing + Math.PI / 3);
  if (a < 0 || b < 0 || a === b || a === start || b === start) return null;

  const penalty = new Float32Array(graph.edgeCount).fill(1);
  const legs: Path[] = [];
  for (const [p, q] of [
    [start, a],
    [a, b],
    [b, start],
  ]) {
    const leg = findPath(graph, p, q, LOOP_BETA, penalty);
    if (!leg) return null;
    addPenalty(penalty, leg, LOOP_PENALTY);
    legs.push(leg);
  }
  return {
    nodes: legs.flatMap((leg, i) => (i === 0 ? leg.nodes : leg.nodes.slice(1))),
    edges: legs.flatMap((leg) => leg.edges),
  };
}

function toRoute(
  graph: Graph,
  path: Path,
  kind: RouteKind,
  id: string,
  countTrees: (route: Route) => number,
): Route {
  const { length, shade } = measure(graph, path);
  const route: Route = {
    id,
    kind,
    geometry: {
      type: "LineString",
      coordinates: path.nodes.map((n) => [
        round6(graph.lng[n]),
        round6(graph.lat[n]),
      ]),
    },
    distance_m: Math.round(length),
    duration_s: Math.round(length / WALK_SPEED_MPS),
    shade: Math.round(shade * 100) / 100,
    segment_shade: path.edges.map((e) => graph.shade[e]),
    trees: 0,
  };
  route.trees = countTrees(route);
  return route;
}

function round6(n: number) {
  return Math.round(n * 1e6) / 1e6;
}

/** A binary min-heap of node ids by priority. Duplicates are fine. */
class MinHeap {
  private ids: Int32Array;
  private keys: Float64Array;
  size = 0;

  constructor(capacity: number) {
    this.ids = new Int32Array(Math.max(16, capacity));
    this.keys = new Float64Array(Math.max(16, capacity));
  }

  push(id: number, key: number) {
    if (this.size === this.ids.length) this.grow();
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.ids[i] = this.ids[parent];
      this.keys[i] = this.keys[parent];
      i = parent;
    }
    this.ids[i] = id;
    this.keys[i] = key;
  }

  pop() {
    const top = this.ids[0];
    const lastId = this.ids[--this.size];
    const lastKey = this.keys[this.size];
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= this.size) break;
      if (child + 1 < this.size && this.keys[child + 1] < this.keys[child])
        child++;
      if (this.keys[child] >= lastKey) break;
      this.ids[i] = this.ids[child];
      this.keys[i] = this.keys[child];
      i = child;
    }
    this.ids[i] = lastId;
    this.keys[i] = lastKey;
    return top;
  }

  private grow() {
    const ids = new Int32Array(this.ids.length * 2);
    const keys = new Float64Array(this.keys.length * 2);
    ids.set(this.ids);
    keys.set(this.keys);
    this.ids = ids;
    this.keys = keys;
  }
}

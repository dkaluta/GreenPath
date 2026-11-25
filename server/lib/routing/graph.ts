/*
 * The pilot city's street graph, in memory.
 *
 * The data is built offline by scripts/pilot/build.ts into
 * server/data/givatayim-graph.json and bundled with the Worker. It is parsed
 * once per Worker instance, then kept in typed arrays so routing is fast.
 */

/** The JSON the build script writes. */
export type RawGraph = {
  area: string;
  bbox: number[];
  origin: number[];
  /** Pairs of millionths of a degree from `origin`: lng, lat, lng, lat... */
  nodes: number[];
  /** Quads: a, b, length in decimetres, shade in percent. */
  edges: number[];
};

/** Metres per degree, close enough at Israel's latitude for short distances. */
export const M_PER_DEG_LAT = 111_320;

export class Graph {
  readonly area: string;
  readonly bbox: [number, number, number, number];
  readonly size: number;
  readonly lng: Float64Array;
  readonly lat: Float64Array;
  /** Metres per degree of longitude at this graph's latitude. */
  readonly mPerDegLng: number;

  /*
   * Adjacency in compressed form: the arcs leaving node i are
   * first[i] .. first[i + 1] - 1. Each street piece is two arcs, one each way,
   * and both carry the same `edge` number.
   */
  readonly first: Int32Array;
  readonly to: Int32Array;
  readonly edge: Int32Array;
  /** Per edge. */
  readonly length: Float32Array;
  readonly shade: Float32Array;

  private readonly cells = new Map<string, number[]>();
  private static readonly CELL_DEG = 0.002;

  constructor(raw: RawGraph) {
    this.area = raw.area;
    this.bbox = raw.bbox as [number, number, number, number];
    this.size = raw.nodes.length / 2;
    this.lng = new Float64Array(this.size);
    this.lat = new Float64Array(this.size);
    for (let i = 0; i < this.size; i++) {
      this.lng[i] = raw.origin[0] + raw.nodes[2 * i] / 1e6;
      this.lat[i] = raw.origin[1] + raw.nodes[2 * i + 1] / 1e6;
    }
    this.mPerDegLng =
      M_PER_DEG_LAT *
      Math.cos((((this.bbox[1] + this.bbox[3]) / 2) * Math.PI) / 180);

    const edges = raw.edges.length / 4;
    this.length = new Float32Array(edges);
    this.shade = new Float32Array(edges);
    const degree = new Int32Array(this.size + 1);
    for (let e = 0; e < edges; e++) {
      degree[raw.edges[4 * e]]++;
      degree[raw.edges[4 * e + 1]]++;
      this.length[e] = raw.edges[4 * e + 2] / 10;
      this.shade[e] = raw.edges[4 * e + 3] / 100;
    }
    this.first = new Int32Array(this.size + 1);
    for (let i = 0; i < this.size; i++) {
      this.first[i + 1] = this.first[i] + degree[i];
    }
    this.to = new Int32Array(edges * 2);
    this.edge = new Int32Array(edges * 2);
    const fill = this.first.slice(0, this.size);
    for (let e = 0; e < edges; e++) {
      const a = raw.edges[4 * e];
      const b = raw.edges[4 * e + 1];
      this.to[fill[a]] = b;
      this.edge[fill[a]++] = e;
      this.to[fill[b]] = a;
      this.edge[fill[b]++] = e;
    }

    for (let i = 0; i < this.size; i++) {
      const key = this.cellKey(this.lng[i], this.lat[i]);
      const list = this.cells.get(key);
      if (list) list.push(i);
      else this.cells.set(key, [i]);
    }
  }

  get edgeCount() {
    return this.length.length;
  }

  /** Straight-line metres between two nodes. */
  distance(a: number, b: number) {
    return this.metres(this.lng[a], this.lat[a], this.lng[b], this.lat[b]);
  }

  metres(lng1: number, lat1: number, lng2: number, lat2: number) {
    const dx = (lng1 - lng2) * this.mPerDegLng;
    const dy = (lat1 - lat2) * M_PER_DEG_LAT;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** The nearest node within `maxM` metres, or -1. */
  nearest(lng: number, lat: number, maxM = 300) {
    const reach = Math.ceil(maxM / (Graph.CELL_DEG * M_PER_DEG_LAT)) + 1;
    const cx = Math.floor(lng / Graph.CELL_DEG);
    const cy = Math.floor(lat / Graph.CELL_DEG);
    let best = -1;
    let bestM = maxM;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        for (const i of this.cells.get(`${cx + dx}:${cy + dy}`) ?? []) {
          const m = this.metres(lng, lat, this.lng[i], this.lat[i]);
          if (m < bestM) {
            bestM = m;
            best = i;
          }
        }
      }
    }
    return best;
  }

  private cellKey(lng: number, lat: number) {
    return `${Math.floor(lng / Graph.CELL_DEG)}:${Math.floor(lat / Graph.CELL_DEG)}`;
  }
}

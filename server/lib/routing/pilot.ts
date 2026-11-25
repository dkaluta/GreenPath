import graphData from "../../data/givatayim-graph.json";
import treeData from "../../data/givatayim-trees.json";
import { Graph, type RawGraph } from "./graph";
import { TreeIndex, type RawTreeRow } from "./trees";

/*
 * The pilot city's data, loaded on first use and then kept for the life of
 * the Worker instance (Workers reuse an instance for many requests).
 *
 * Both files come from `npm run pilot:build`; see scripts/pilot/build.ts.
 */

let graph: Graph | null = null;
let trees: TreeIndex | null = null;

export function pilotGraph() {
  graph ??= new Graph(graphData as RawGraph);
  return graph;
}

export function pilotTrees() {
  trees ??= new TreeIndex(treeData.trees as unknown as RawTreeRow[]);
  return trees;
}

/** The credit line every response built from this data should carry. */
export const DATA_SOURCES =
  "© OpenStreetMap contributors (ODbL); יער עירוני דיגיטלי (ODbL); CHMv2 © Meta and WRI (CC BY 4.0)";

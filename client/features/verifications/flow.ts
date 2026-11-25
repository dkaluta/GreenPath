import { FIXTURE_TREE } from "./fixture";
import type { UploadedPhoto } from "./hooks";

/*
 * The tree being checked, carried from the stop screen through the camera
 * to the match screen.
 *
 * In sessionStorage rather than in memory, because phones often reload a
 * tab after the camera has been open, and the person should not have to
 * start again.
 */

/** A tree the app asks someone to check. */
export type StopTree = {
  /** The יע"ד id. */
  id: string;
  /** What the dataset says it is, as a scientific name. */
  species: string;
  street: string | null;
  houseNumber: string | null;
  lat: number;
  lng: number;
  /** Which side of the walker it is on, and how far. */
  side: "left" | "right" | "ahead";
  distanceM: number;
  /** A picture of the species, when there is one. */
  referenceImageUrl?: string | null;
};

export type VerifyFlow = {
  tree: StopTree;
  treePhoto: UploadedPhoto | null;
  leavesPhoto: UploadedPhoto | null;
};

const KEY = "greenpath.verify";

export function readFlow(): VerifyFlow | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as VerifyFlow) : null;
  } catch {
    return null;
  }
}

export function writeFlow(flow: VerifyFlow) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flow));
  } catch {
    // Not fatal: only a reload mid-flow loses the tree.
  }
}

export function clearFlow() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Starts checking a tree. */
export function startFlow(tree: StopTree): VerifyFlow {
  const flow = { tree, treePhoto: null, leavesPhoto: null };
  writeFlow(flow);
  return flow;
}

/** The flow in progress, or one for the fixture tree. */
export function currentFlow(): VerifyFlow {
  return (
    readFlow() ?? { tree: FIXTURE_TREE, treePhoto: null, leavesPhoto: null }
  );
}

import type { CreateWalkInput } from "@shared/schemas/walk";
import type { VerificationAnswer } from "@shared/schemas/verification";
import type { Point } from "@shared/schemas/report";
import { useEffect } from "react";

/*
 * The walk in progress, kept on the phone until it ends.
 *
 * It lives in localStorage so a reload, or the phone dropping the tab while
 * the camera is open, does not lose the walk. When the summary screen
 * opens, the walk is sent to POST /api/walks and cleared.
 *
 * For the navigation screen: call useWalkTracker() while navigating, so the
 * distance is measured from the phone's location. If the routing knows
 * which streets are shaded, pass `isShaded` and the summary gets a share of
 * shade; without it, the summary shows the shade as unknown.
 */

const KEY = "greenpath.walk";

/** Average adult step, used when the phone gives no step count. */
const METERS_PER_STEP = 0.75;

/** GPS fixes worse than this are ignored, so standing still adds nothing. */
const MAX_ACCURACY_M = 35;

export type WalkTree = {
  treeId: string | null;
  species: string | null;
  answer: VerificationAnswer;
};

export type WalkSession = {
  startedAt: string;
  distanceM: number;
  /** Of the distance above, how much had shade data, and how much was shaded. */
  shadeKnownM: number;
  shadedM: number;
  lastPoint: Point | null;
  trees: WalkTree[];
};

export function readWalk(): WalkSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WalkSession) : null;
  } catch {
    return null;
  }
}

function writeWalk(walk: WalkSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(walk));
  } catch {
    // Private mode or a full disk: the walk just won't survive a reload.
  }
}

export function clearWalk() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The walk in progress, starting one now if there is none. */
export function ensureWalk(): WalkSession {
  const existing = readWalk();
  if (existing) return existing;
  const walk: WalkSession = {
    startedAt: new Date().toISOString(),
    distanceM: 0,
    shadeKnownM: 0,
    shadedM: 0,
    lastPoint: null,
    trees: [],
  };
  writeWalk(walk);
  return walk;
}

/** Notes a checked tree, for the summary. */
export function recordTree(tree: WalkTree) {
  const walk = ensureWalk();
  walk.trees.push(tree);
  writeWalk(walk);
}

/** Adds a stretch of walking. `shaded` is null when there is no shade data. */
export function addDistance(meters: number, shaded: boolean | null) {
  const walk = ensureWalk();
  walk.distanceM += meters;
  if (shaded !== null) {
    walk.shadeKnownM += meters;
    if (shaded) walk.shadedM += meters;
  }
  writeWalk(walk);
}

/** Distance between two points on the earth, in meters. */
export function metersBetween(a: Point, b: Point) {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Adds a GPS fix to the walk. */
export function recordPosition(
  point: Point,
  accuracyM: number,
  isShaded?: (from: Point, to: Point) => boolean,
) {
  if (accuracyM > MAX_ACCURACY_M) return;
  const walk = ensureWalk();
  const last = walk.lastPoint;
  walk.lastPoint = point;
  writeWalk(walk);
  if (!last) return;
  const meters = metersBetween(last, point);
  // Movement smaller than the GPS's own error is noise, not walking.
  if (meters < accuracyM) {
    walk.lastPoint = last;
    writeWalk(walk);
    return;
  }
  addDistance(meters, isShaded ? isShaded(last, point) : null);
}

/**
 * Measures the walk from the phone's location while mounted. For the
 * navigation screen.
 */
export function useWalkTracker(isShaded?: (from: Point, to: Point) => boolean) {
  useEffect(() => {
    ensureWalk();
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (position) =>
        recordPosition(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          position.coords.accuracy,
          isShaded,
        ),
      () => {
        // No location: the walk is still recorded, just without distance.
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [isShaded]);
}

/** What the summary shows, from the walk on the phone. */
export function summarizeWalk(walk: WalkSession) {
  const distance_m = Math.round(walk.distanceM);
  return {
    distance_m,
    steps: Math.round(distance_m / METERS_PER_STEP),
    shade_share:
      walk.shadeKnownM > 0
        ? Math.min(1, walk.shadedM / walk.shadeKnownM)
        : null,
  };
}

/** The body for POST /api/walks, ending the walk now. */
export function toWalkInput(
  walk: WalkSession,
  endedAt = new Date(),
): CreateWalkInput {
  const started = Date.parse(walk.startedAt);
  // A walk left open for days (the phone forgot to finish it) is capped at
  // a day, the most the server accepts.
  const ended = Math.min(endedAt.getTime(), started + 24 * 60 * 60 * 1000);
  return {
    ...summarizeWalk(walk),
    started_at: walk.startedAt,
    ended_at: new Date(Math.max(ended, started)).toISOString(),
  };
}

import {
  isInSupportedArea,
  PILOT_AREA,
  type LatLng,
  type RouteRequest,
  type RoutesResponse,
} from "@shared/schemas/route";
import type { TreesResponse } from "@shared/schemas/tree";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/*
 * Talking to /api/routes and /api/trees. See docs/06-shade-routing.markdown.
 */

export const routeKeys = {
  routes: (request: RouteRequest | null) => ["routes", request] as const,
  trees: (bbox: string) => ["trees", bbox] as const,
};

/**
 * Shaded routes for a request, shadiest first. Pass `null` while the request
 * is not ready (for example while the location is still being found).
 *
 * It is a POST, but asking twice gives the same answer, so it is cached
 * like a GET.
 */
export function useRoutes(request: RouteRequest | null) {
  return useQuery({
    queryKey: routeKeys.routes(request),
    queryFn: ({ signal }) =>
      api<RoutesResponse>("/api/routes", {
        method: "POST",
        body: request,
        signal,
      }),
    enabled: request !== null,
    staleTime: 10 * 60 * 1000,
  });
}

/** The trees in a box: [minLng, minLat, maxLng, maxLat]. */
export function useTrees(bbox: [number, number, number, number] | null) {
  const key = bbox ? bbox.map((n) => n.toFixed(5)).join(",") : "";
  return useQuery({
    queryKey: routeKeys.trees(key),
    queryFn: ({ signal }) =>
      api<TreesResponse>(`/api/trees?bbox=${key}`, { signal }),
    enabled: bbox !== null,
    staleTime: 60 * 60 * 1000,
  });
}

export type Origin = {
  point: LatLng;
  /** True when we could not use the person's own location. */
  fallback: boolean;
};

/**
 * Where a walk starts: the given point, else the person's location if it is
 * in or near a supported city (shared/cities.ts), else the middle of
 * Givatayim. `null` while the browser is still finding the location, or when
 * `enabled` is false.
 */
export function useOrigin(given: LatLng | null, enabled = true): Origin | null {
  const [located, setLocated] = useState<Origin | null>(null);

  useEffect(() => {
    if (given || !enabled) return;
    const fallback = () =>
      setLocated({ point: PILOT_AREA.center, fallback: true });
    if (!("geolocation" in navigator)) {
      fallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: coords.latitude, lng: coords.longitude };
        if (isInSupportedArea(point)) setLocated({ point, fallback: false });
        else fallback();
      },
      fallback,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, [given, enabled]);

  if (!enabled) return null;
  return given ? { point: given, fallback: false } : located;
}

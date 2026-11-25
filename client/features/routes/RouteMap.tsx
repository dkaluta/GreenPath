import type { LatLng, Route } from "@shared/schemas/route";
import { useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_CENTER,
  MapView,
  type LngLat,
  type MapHandle,
  type MapMarker,
} from "../map";
import { routeIdOf, routeToLines } from "./mapLines";

type RouteMapProps = {
  routes: Route[];
  selectedId?: string;
  /** Where the walk starts, shown as the location dot. */
  origin?: LatLng | null;
  /** The destination marker, for routes to a destination. */
  destination?: LatLng | null;
  /** Tapping a route on the map chooses it. */
  onSelect?: (routeId: string) => void;
};

/**
 * The routes on the shared map: the chosen one split into shaded (green) and
 * sunny stretches, the others faded underneath. The map moves to fit the
 * chosen route whenever it changes.
 */
export function RouteMap({
  routes,
  selectedId,
  origin,
  destination,
  onSelect,
}: RouteMapProps) {
  const map = useRef<MapHandle>(null);
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];

  const lines = useMemo(
    () => [
      // Others first, so the chosen route is drawn on top.
      ...routes
        .filter((r) => r !== selected)
        .flatMap((r) => routeToLines(r, true)),
      ...(selected ? routeToLines(selected) : []),
    ],
    [routes, selected],
  );

  const markers = useMemo<MapMarker[]>(
    () =>
      destination
        ? [
            {
              id: "destination",
              position: [destination.lng, destination.lat],
              kind: "destination",
            },
          ]
        : [],
    [destination],
  );

  useEffect(() => {
    if (selected) map.current?.fitTo(selected.geometry.coordinates as LngLat[]);
  }, [selected]);

  const start: LngLat | null = origin ? [origin.lng, origin.lat] : null;

  return (
    <MapView
      ref={map}
      center={start ?? DEFAULT_CENTER}
      lines={lines}
      markers={markers}
      userLocation={start}
      onLineClick={onSelect ? (id) => onSelect(routeIdOf(id)) : undefined}
    />
  );
}

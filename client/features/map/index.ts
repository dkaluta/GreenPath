/*
 * The map, for every screen that shows one.
 *
 *     import { MapView, useUserLocation } from "@/features/map";
 *
 * Drawing on it (for example a route from the routing API):
 *
 *   - `lines`: MapLine[]. Each is { id, coordinates: [lng, lat][], kind }.
 *     kind "shade" is a thick leaf-green shaded stretch (the default), "sun"
 *     a stretch in the sun, "plain" anything else. `dimmed: true` fades a
 *     route that is not the chosen one. Split a route into one line per
 *     shaded or sunny stretch.
 *   - `markers`: MapMarker[]. Each is { id, position: [lng, lat], kind,
 *     label? }. kind "tree", "task" (a tree to check) or "destination".
 *   - `onMarkerClick(id)` and `onLineClick(id)` say what was tapped.
 *   - `userLocation`: [lng, lat] for the location dot. useUserLocation()
 *     gives you one.
 *   - `ref`: a MapHandle with zoomIn, zoomOut, flyTo(center, zoom?) and
 *     fitTo(points), plus getMap() for the raw MapLibre map.
 *   - `insets`: how much of each side floating panels cover, so flyTo and
 *     fitTo keep the subject visible. Logical sides: start and end.
 *
 * Colours come from the --map-* tokens in client/styles/tokens.css, and
 * the style (style.ts) follows the system dark mode by itself. Pass plain
 * data: no colours, no MapLibre types.
 */

export { BottomSheet, type BottomSheetProps } from "./BottomSheet";
export {
  ALL_FILTERS_ON,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type MapFilter,
  type MapFilters,
  type MapInsets,
} from "./defaults";
export { MapView, type MapHandle, type MapViewProps } from "./MapView";
export type { LngLat, MapLine, MapMarker } from "./overlays";
export { useUserLocation, type UserLocation } from "./useUserLocation";

import type { LngLat } from "./overlays";

/** Givatayim, the pilot city. */
export const DEFAULT_CENTER: LngLat = [34.8105, 32.0717];
export const DEFAULT_ZOOM = 15;

/** What the filter chips and the layers menu switch on and off. */
export type MapFilter = "shade" | "parks" | "fountains" | "benches";
export type MapFilters = Record<MapFilter, boolean>;
export const ALL_FILTERS_ON: MapFilters = {
  shade: true,
  parks: true,
  fountains: true,
  benches: true,
};

/** Room the map keeps clear for panels floating over it, in pixels. */
export type MapInsets = {
  top?: number;
  bottom?: number;
  start?: number;
  end?: number;
};

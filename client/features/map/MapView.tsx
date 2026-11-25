import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react";
import { DIRECTION, LANG } from "../../lib/config";
import { cx } from "../../lib/cx";
import { t } from "../../lib/i18n";
import { DARK_SCHEME_QUERY, readMapColors } from "./colors";
import {
  linesToGeoJSON,
  markersToGeoJSON,
  pointToGeoJSON,
  type LngLat,
  type MapLine,
  type MapMarker,
} from "./overlays";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type MapFilter,
  type MapFilters,
  type MapInsets,
} from "./defaults";
import { buildMapStyle, OVERLAY, TOGGLEABLE_LAYERS } from "./style";
import styles from "./MapView.module.css";

// MapLibre finds its worker next to its own file, which Vite moves when it
// bundles dependencies. The worker file has no imports, so hand Vite's copy
// of it to MapLibre instead.
maplibregl.setWorkerUrl(workerUrl);

/** What a parent can do to the map through `ref`. */
export type MapHandle = {
  zoomIn(): void;
  zoomOut(): void;
  flyTo(center: LngLat, zoom?: number): void;
  /** Moves the map so every point is in view, clear of `insets`. */
  fitTo(points: LngLat[]): void;
  /** The MapLibre map itself, for anything this API does not cover. */
  getMap(): maplibregl.Map | null;
};

export type MapViewProps = {
  /** Where the map starts, and where it moves when this changes. */
  center?: LngLat;
  zoom?: number;
  /** Lines drawn over the streets, such as the stretches of a route. */
  lines?: readonly MapLine[];
  markers?: readonly MapMarker[];
  /** The blue dot, here in --map-location. Leave out to hide it. */
  userLocation?: LngLat | null;
  /** Layers to show. Missing keys count as on. */
  filters?: Partial<MapFilters>;
  /** Space taken by floating panels, so fitTo() and flyTo() avoid them. */
  insets?: MapInsets;
  /** Which bottom corner the OpenStreetMap credit sits in. */
  attribution?: "start" | "end";
  onMarkerClick?: (id: string) => void;
  onLineClick?: (id: string) => void;
  onMoveEnd?: (center: LngLat, zoom: number) => void;
  className?: string;
  ref?: Ref<MapHandle>;
};

/**
 * The GreenPath map. It fills its parent, so give the parent a size.
 *
 *     const [route] = useRoute();
 *     <MapView
 *       center={[34.81, 32.07]}
 *       lines={route.segments.map((s) => ({
 *         id: s.id,
 *         coordinates: s.coordinates,
 *         kind: s.shaded ? "shade" : "sun",
 *       }))}
 *       markers={[{ id: "to", position: dest, kind: "destination" }]}
 *       userLocation={location}
 *     />
 *
 * Change `lines` or `markers` and the map redraws them; nothing else moves.
 * The style follows the --map-* tokens and the system dark mode, and the
 * labels are in the app's language.
 */
export function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  lines = NO_LINES,
  markers = NO_MARKERS,
  userLocation = null,
  filters,
  insets,
  attribution = "start",
  onMarkerClick,
  onLineClick,
  onMoveEnd,
  className,
  ref,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // The latest props, for event handlers and for redrawing after a style
  // change. Refs, so the map is not rebuilt whenever a parent re-renders.
  const latest = useRef({
    lines,
    markers,
    userLocation,
    filters,
    insets,
    onMarkerClick,
    onLineClick,
    onMoveEnd,
  });
  useLayoutEffect(() => {
    latest.current = {
      lines,
      markers,
      userLocation,
      filters,
      insets,
      onMarkerClick,
      onLineClick,
      onMoveEnd,
    };
  });

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    enableRtlText();

    const map = new maplibregl.Map({
      container,
      style: buildMapStyle({ colors: readMapColors(), lang: LANG }),
      center,
      zoom,
      attributionControl: false,
      // A calm, flat map: no tilting, no turning.
      maxPitch: 0,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      locale: mapLocale(),
    });
    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      physicalCorner(attribution),
    );
    mapRef.current = map;

    const redraw = () => syncOverlays(map, latest.current);
    map.on("load", redraw);
    // The credit starts as the small (i) button, not spread over the controls.
    map.once("load", () => {
      const credit = container.querySelector(".maplibregl-ctrl-attrib");
      credit?.classList.remove("maplibregl-compact-show");
      credit?.removeAttribute("open");
    });

    const clickable = (layer: string, key: "onMarkerClick" | "onLineClick") => {
      map.on("click", layer, (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") latest.current[key]?.(id);
      });
      map.on("mouseenter", layer, () => {
        if (latest.current[key]) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layer, () => {
        map.getCanvas().style.cursor = "";
      });
    };
    clickable(OVERLAY.markers, "onMarkerClick");
    clickable(OVERLAY.lines, "onLineClick");

    map.on("moveend", () => {
      const c = map.getCenter();
      latest.current.onMoveEnd?.([c.lng, c.lat], map.getZoom());
    });

    // Light and dark: rebuild the style from the tokens, which tokens.css
    // has already switched, then put our data back.
    const scheme = window.matchMedia(DARK_SCHEME_QUERY);
    const onSchemeChange = () => {
      map.setStyle(buildMapStyle({ colors: readMapColors(), lang: LANG }), {
        diff: true,
      });
      map.once("styledata", redraw);
    };
    scheme.addEventListener("change", onSchemeChange);

    return () => {
      scheme.removeEventListener("change", onSchemeChange);
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw our data when it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) syncOverlays(map, latest.current);
  }, [lines, markers, userLocation, filters]);

  // Move when the centre or zoom props change (by value, not identity).
  const [lng, lat] = center;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const here = map.getCenter();
    if (here.lng === lng && here.lat === lat && map.getZoom() === zoom) return;
    map.easeTo({
      center: [lng, lat],
      zoom,
      padding: toPadding(latest.current.insets),
    });
  }, [lng, lat, zoom]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      flyTo: (to, toZoom) =>
        mapRef.current?.flyTo({
          center: to,
          zoom: toZoom ?? Math.max(mapRef.current.getZoom(), 16),
          padding: toPadding(latest.current.insets),
        }),
      fitTo: (points) => {
        const map = mapRef.current;
        if (!map || points.length === 0) return;
        const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
        for (const point of points) bounds.extend(point);
        map.fitBounds(bounds, {
          padding: addMargin(toPadding(latest.current.insets), 48),
          maxZoom: 17,
        });
      },
      getMap: () => mapRef.current,
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className={cx(styles.map, className)}
      role="region"
      aria-label={t.map.label}
    />
  );
}

const NO_LINES: readonly MapLine[] = [];
const NO_MARKERS: readonly MapMarker[] = [];

type OverlayState = {
  lines: readonly MapLine[];
  markers: readonly MapMarker[];
  userLocation: LngLat | null;
  filters?: Partial<MapFilters>;
};

function syncOverlays(map: maplibregl.Map, state: OverlayState) {
  const set = (id: string, data: GeoJSON.FeatureCollection) =>
    map.getSource<GeoJSONSource>(id)?.setData(data);
  set(OVERLAY.linesSource, linesToGeoJSON(state.lines));
  set(OVERLAY.markersSource, markersToGeoJSON(state.markers));
  set(OVERLAY.userSource, pointToGeoJSON(state.userLocation));

  const on = (filter: MapFilter) => state.filters?.[filter] !== false;
  const show = (layer: string, visible: boolean) => {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
    }
  };
  show(OVERLAY.lines, on("shade"));
  show(OVERLAY.linesCasing, on("shade"));
  for (const [filter, layers] of Object.entries(TOGGLEABLE_LAYERS)) {
    for (const layer of layers) show(layer, on(filter as MapFilter));
  }
}

/** MapLibre places controls by physical corner; ours are logical. */
function physicalCorner(side: "start" | "end") {
  const left = (side === "start") === (DIRECTION === "ltr");
  return left ? "bottom-left" : "bottom-right";
}

function toPadding(insets: MapInsets = {}) {
  const start = insets.start ?? 0;
  const end = insets.end ?? 0;
  const ltr = DIRECTION === "ltr";
  return {
    top: insets.top ?? 0,
    bottom: insets.bottom ?? 0,
    left: ltr ? start : end,
    right: ltr ? end : start,
  };
}

function addMargin(
  padding: ReturnType<typeof toPadding>,
  margin: number,
): ReturnType<typeof toPadding> {
  return {
    top: padding.top + margin,
    bottom: padding.bottom + margin,
    left: padding.left + margin,
    right: padding.right + margin,
  };
}

/** The words on MapLibre's own controls, in our language. */
function mapLocale(): Record<string, string> {
  return {
    "AttributionControl.ToggleAttribution": t.map.attribution,
    "Map.Title": t.map.label,
  };
}

/**
 * Hebrew and Arabic labels need MapLibre's right-to-left text plugin, which
 * puts letters in reading order and joins Arabic letters. It is loaded from
 * a CDN the first time a right-to-left label is drawn.
 */
const RTL_TEXT_PLUGIN =
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js";

function enableRtlText() {
  if (maplibregl.getRTLTextPluginStatus() !== "unavailable") return;
  maplibregl.setRTLTextPlugin(RTL_TEXT_PLUGIN, true).catch((error: unknown) => {
    console.warn("Could not load the right-to-left map text plugin", error);
  });
}

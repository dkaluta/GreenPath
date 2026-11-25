import type {
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import type { Lang } from "../../lib/i18n";
import type { MapColors } from "./colors";

/**
 * The GreenPath map style: calm, like Apple Maps, in our palette.
 *
 * Built in code rather than kept as a JSON file so every colour comes from
 * the --map-* tokens (see colors.ts) and every label is in the app's
 * language. The tiles are OpenStreetMap data in the OpenMapTiles schema,
 * served free by OpenFreeMap (https://openfreemap.org), with no key.
 *
 * This file has no browser code, so it can be tested on its own.
 */

export const TILES_URL = "https://tiles.openfreemap.org/planet";
export const GLYPHS_URL =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/** OpenFreeMap's glyphs include the Hebrew and Arabic ranges. */
const FONT_REGULAR = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];

export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** The ids of the sources and layers that MapView fills with our own data. */
export const OVERLAY = {
  linesSource: "gp-lines",
  linesCasing: "gp-lines-casing",
  lines: "gp-lines",
  markersSource: "gp-markers",
  markers: "gp-markers",
  markerLabels: "gp-marker-labels",
  userSource: "gp-user",
  userAccuracy: "gp-user-accuracy",
  user: "gp-user",
} as const;

/**
 * The base-map layers the filter chips switch on and off. The "shade"
 * filter hides the shaded-street overlay lines instead.
 */
export const TOGGLEABLE_LAYERS = {
  parks: ["landcover-green", "landuse-green", "park-fill", "park-label"],
  fountains: ["poi-fountain"],
  benches: ["poi-bench"],
} as const;

/**
 * The label text in the current language, falling back to the local name.
 * English also tries the Latin transliteration before the local name.
 */
export function nameExpression(lang: Lang): ExpressionSpecification {
  if (lang === "en") {
    return [
      "coalesce",
      ["get", "name:en"],
      ["get", "name:latin"],
      ["get", "name"],
    ];
  }
  return ["coalesce", ["get", `name:${lang}`], ["get", "name"]];
}

/** Line width that grows with zoom: `stops` are [zoom, width] pairs. */
function widthByZoom(...stops: [number, number][]): ExpressionSpecification {
  return [
    "interpolate",
    ["exponential", 1.5],
    ["zoom"],
    ...stops.flat(),
  ] as ExpressionSpecification;
}

const notTunnel: ExpressionSpecification = ["!=", ["get", "brunnel"], "tunnel"];

function roadClass(...classes: string[]): ExpressionSpecification {
  return [
    "all",
    [
      "match",
      ["geometry-type"],
      ["LineString", "MultiLineString"],
      true,
      false,
    ],
    notTunnel,
    ["match", ["get", "class"], classes, true, false],
  ];
}

/** Road widths by class, at zoom 12 and zoom 18. */
const ROADS: { id: string; classes: string[]; widths: [number, number] }[] = [
  { id: "path", classes: ["path", "pedestrian"], widths: [0.5, 4] },
  { id: "minor", classes: ["minor", "service", "track"], widths: [0.5, 12] },
  {
    id: "secondary",
    classes: ["secondary", "tertiary"],
    widths: [1.5, 18],
  },
  { id: "primary", classes: ["primary", "trunk"], widths: [2, 22] },
  { id: "motorway", classes: ["motorway"], widths: [2.5, 24] },
];

export type BuildStyleOptions = {
  colors: MapColors;
  lang: Lang;
};

export function buildMapStyle({
  colors,
  lang,
}: BuildStyleOptions): StyleSpecification {
  const name = nameExpression(lang);
  const halo = colors.land;

  const roadCasings: LayerSpecification[] = ROADS.filter(
    (road) => road.id !== "path",
  ).map((road) => ({
    id: `road-${road.id}-casing`,
    type: "line",
    source: "openmaptiles",
    "source-layer": "transportation",
    filter: roadClass(...road.classes),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": colors["street-casing"],
      "line-width": widthByZoom(
        [12, road.widths[0] + 1],
        [18, road.widths[1] + 3],
      ),
    },
  }));

  const roads: LayerSpecification[] = ROADS.map((road) => ({
    id: `road-${road.id}`,
    type: "line",
    source: "openmaptiles",
    "source-layer": "transportation",
    filter: roadClass(...road.classes),
    minzoom: road.id === "path" ? 14 : 0,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": colors.street,
      "line-width": widthByZoom([12, road.widths[0]], [18, road.widths[1]]),
      ...(road.id === "path"
        ? { "line-dasharray": [2, 1], "line-opacity": 0.9 }
        : {}),
    },
  }));

  return {
    version: 8,
    name: "GreenPath",
    glyphs: GLYPHS_URL,
    sources: {
      openmaptiles: {
        type: "vector",
        url: TILES_URL,
        attribution: ATTRIBUTION,
      },
      [OVERLAY.linesSource]: emptySource(),
      [OVERLAY.markersSource]: emptySource(),
      [OVERLAY.userSource]: emptySource(),
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": colors.land },
      },

      // Green: parks, grass and woods. Calm fills, no outlines.
      {
        id: "landcover-green",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: ["match", ["get", "class"], ["grass", "wood"], true, false],
        paint: { "fill-color": colors.park, "fill-opacity": 0.45 },
      },
      {
        id: "landuse-green",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: [
          "match",
          ["get", "class"],
          ["cemetery", "pitch", "playground", "garden"],
          true,
          false,
        ],
        paint: { "fill-color": colors.park, "fill-opacity": 0.3 },
      },
      {
        id: "park-fill",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        filter: [
          "match",
          ["geometry-type"],
          ["Polygon", "MultiPolygon"],
          true,
          false,
        ],
        paint: { "fill-color": colors.park, "fill-opacity": 0.6 },
      },

      // Water.
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        filter: notTunnel,
        paint: { "fill-color": colors.water },
      },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        filter: notTunnel,
        paint: {
          "line-color": colors.water,
          "line-width": widthByZoom([10, 1], [18, 6]),
        },
      },

      // Buildings: a quiet step up from the land, only up close.
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 15,
        paint: {
          "fill-color": colors.building,
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0, 16, 1],
        },
      },

      // Streets: white on warm land, casings underneath.
      ...roadCasings,
      ...roads,

      // Our data, drawn above the streets and under the labels.
      {
        id: OVERLAY.linesCasing,
        type: "line",
        source: OVERLAY.linesSource,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": colors["street-casing"],
          "line-width": widthByZoom([12, 5], [18, 16]),
          "line-opacity": ["case", ["get", "dimmed"], 0.4, 1],
        },
      },
      {
        id: OVERLAY.lines,
        type: "line",
        source: OVERLAY.linesSource,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "coalesce",
            ["get", "color"],
            [
              "match",
              ["get", "kind"],
              "sun",
              colors.sun,
              "plain",
              colors.label,
              colors.shade,
            ],
          ],
          "line-width": widthByZoom([12, 3], [18, 12]),
          "line-opacity": ["case", ["get", "dimmed"], 0.4, 1],
        },
      },

      // Points of interest: few, and only the ones a walker needs.
      {
        id: "poi-fountain",
        type: "circle",
        source: "openmaptiles",
        "source-layer": "poi",
        minzoom: 15,
        filter: [
          "match",
          ["get", "subclass"],
          ["drinking_water", "fountain", "water_point"],
          true,
          false,
        ],
        paint: {
          "circle-color": colors.water,
          "circle-stroke-color": colors.poi,
          "circle-stroke-width": 1.5,
          "circle-radius": widthByZoom([15, 3], [18, 6]),
        },
      },
      {
        id: "poi-bench",
        type: "circle",
        source: "openmaptiles",
        "source-layer": "poi",
        minzoom: 16,
        filter: ["==", ["get", "subclass"], "bench"],
        paint: {
          "circle-color": colors.land,
          "circle-stroke-color": colors.poi,
          "circle-stroke-width": 1.5,
          "circle-radius": widthByZoom([16, 2.5], [18, 4]),
        },
      },

      // Labels.
      {
        id: "water-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "water_name",
        layout: {
          "text-field": name,
          "text-font": FONT_REGULAR,
          "text-size": 13,
        },
        paint: {
          "text-color": colors["label-park"],
          "text-halo-color": colors.water,
          "text-halo-width": 1,
        },
      },
      {
        id: "park-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "park",
        minzoom: 13,
        filter: [
          "match",
          ["geometry-type"],
          ["Point", "MultiPoint"],
          true,
          false,
        ],
        layout: {
          "text-field": name,
          "text-font": FONT_REGULAR,
          "text-size": 12,
          "text-max-width": 8,
        },
        paint: {
          "text-color": colors["label-park"],
          "text-halo-color": halo,
          "text-halo-width": 1.2,
        },
      },
      {
        id: "street-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "transportation_name",
        minzoom: 14,
        filter: [
          "match",
          ["get", "class"],
          ["primary", "secondary", "tertiary", "trunk", "minor", "pedestrian"],
          true,
          false,
        ],
        layout: {
          "symbol-placement": "line",
          "text-field": name,
          "text-font": FONT_REGULAR,
          "text-size": widthByZoom([14, 10], [18, 14]),
          "text-max-angle": 30,
        },
        paint: {
          "text-color": colors.label,
          "text-halo-color": colors.street,
          "text-halo-width": 1.5,
        },
      },
      {
        id: "place-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: [
          "match",
          ["get", "class"],
          ["city", "town", "village", "suburb", "neighbourhood", "quarter"],
          true,
          false,
        ],
        layout: {
          "text-field": name,
          "text-font": [
            "match",
            ["get", "class"],
            ["city", "town"],
            ["literal", FONT_BOLD],
            ["literal", FONT_REGULAR],
          ],
          "text-size": ["match", ["get", "class"], "city", 17, "town", 15, 13],
          "text-max-width": 8,
        },
        paint: {
          "text-color": colors.label,
          "text-halo-color": halo,
          "text-halo-width": 1.5,
        },
      },

      // Markers and the location dot sit on top of everything.
      {
        id: OVERLAY.markers,
        type: "circle",
        source: OVERLAY.markersSource,
        paint: {
          "circle-color": [
            "coalesce",
            ["get", "color"],
            [
              "match",
              ["get", "kind"],
              "tree",
              colors.park,
              "task",
              colors.sun,
              colors.label,
            ],
          ],
          "circle-radius": ["match", ["get", "kind"], "destination", 9, 7],
          "circle-stroke-color": colors.street,
          "circle-stroke-width": 2,
        },
      },
      {
        id: OVERLAY.markerLabels,
        type: "symbol",
        source: OVERLAY.markersSource,
        filter: ["has", "label"],
        layout: {
          "text-field": ["get", "label"],
          "text-font": FONT_BOLD,
          "text-size": 12,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": colors.label,
          "text-halo-color": halo,
          "text-halo-width": 1.5,
        },
      },
      {
        id: OVERLAY.userAccuracy,
        type: "circle",
        source: OVERLAY.userSource,
        paint: {
          "circle-color": colors.location,
          "circle-opacity": 0.15,
          "circle-radius": 22,
        },
      },
      {
        id: OVERLAY.user,
        type: "circle",
        source: OVERLAY.userSource,
        paint: {
          "circle-color": colors.location,
          "circle-radius": 8,
          "circle-stroke-color": colors.street,
          "circle-stroke-width": 3,
        },
      },
    ],
  };
}

function emptySource() {
  return {
    type: "geojson" as const,
    data: { type: "FeatureCollection" as const, features: [] },
  };
}

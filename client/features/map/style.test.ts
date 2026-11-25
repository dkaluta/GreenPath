import { describe, expect, it } from "vitest";
import { FALLBACK_MAP_COLORS, type MapColors } from "./colors";
import { linesToGeoJSON, markersToGeoJSON, pointToGeoJSON } from "./overlays";
import {
  buildMapStyle,
  nameExpression,
  OVERLAY,
  TOGGLEABLE_LAYERS,
} from "./style";

const colors: MapColors = { ...FALLBACK_MAP_COLORS, park: "#123456" };

describe("buildMapStyle", () => {
  const style = buildMapStyle({ colors, lang: "he" });
  const layer = (id: string) => style.layers.find((l) => l.id === id);

  it("paints the land and the parks from the tokens", () => {
    expect(layer("background")).toMatchObject({
      paint: { "background-color": colors.land },
    });
    expect(layer("park-fill")).toMatchObject({
      paint: { "fill-color": "#123456" },
    });
  });

  it("has the overlay sources and layers MapView fills", () => {
    for (const id of [
      OVERLAY.linesSource,
      OVERLAY.markersSource,
      OVERLAY.userSource,
    ]) {
      expect(style.sources[id]).toMatchObject({ type: "geojson" });
    }
    for (const id of [OVERLAY.lines, OVERLAY.markers, OVERLAY.user]) {
      expect(layer(id)).toBeDefined();
    }
  });

  it("has every layer the filters switch", () => {
    for (const ids of Object.values(TOGGLEABLE_LAYERS)) {
      for (const id of ids) expect(layer(id)).toBeDefined();
    }
  });

  it("has unique layer ids", () => {
    const ids = style.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws the user's dot above the route lines", () => {
    const ids = style.layers.map((l) => l.id);
    expect(ids.indexOf(OVERLAY.user)).toBeGreaterThan(
      ids.indexOf(OVERLAY.lines),
    );
  });
});

describe("nameExpression", () => {
  it("prefers the label in the app's language", () => {
    expect(nameExpression("he")).toEqual([
      "coalesce",
      ["get", "name:he"],
      ["get", "name"],
    ]);
    expect(nameExpression("ar")[1]).toEqual(["get", "name:ar"]);
  });

  it("tries the Latin name in English before the local one", () => {
    expect(nameExpression("en")).toEqual([
      "coalesce",
      ["get", "name:en"],
      ["get", "name:latin"],
      ["get", "name"],
    ]);
  });
});

describe("overlays", () => {
  it("turns lines into GeoJSON with a default kind", () => {
    const geo = linesToGeoJSON([
      {
        id: "a",
        coordinates: [
          [34.8, 32.07],
          [34.81, 32.07],
        ],
      },
    ]);
    expect(geo.features[0].properties).toEqual({
      id: "a",
      kind: "shade",
      dimmed: false,
    });
    expect(geo.features[0].geometry.coordinates).toHaveLength(2);
  });

  it("leaves out properties that were not given", () => {
    const geo = markersToGeoJSON([{ id: "t", position: [34.8, 32.07] }]);
    expect(geo.features[0].properties).not.toHaveProperty("label");
    expect(geo.features[0].properties).not.toHaveProperty("color");
  });

  it("has no location dot without a location", () => {
    expect(pointToGeoJSON(null).features).toHaveLength(0);
    expect(pointToGeoJSON([34.8, 32.07]).features).toHaveLength(1);
  });
});

import { PILOT_AREA, targetToMeters, type Route } from "@shared/schemas/route";
import { beforeAll, describe, expect, it } from "vitest";
import { Graph, type RawGraph } from "./graph";
import { findCityConfig } from "@shared/cities";
import { cityGraph, cityTrees } from "./cities";
import {
  edgeCost,
  findPath,
  freeWalk,
  measure,
  OutsideAreaError,
  routeToDestination,
} from "./router";

/*
 * A small grid for exact checks:
 *
 *   3 ── 4 ── 5        row y = 100 m
 *   │    │    │
 *   0 ── 1 ── 2        row y = 0
 *
 * The bottom row is 100 m in full sun. Going up and over the top row is
 * 300 m, all of it in full shade.
 */
function grid(): Graph {
  const origin = [34.8, 32.06];
  const mPerDegLng =
    111_320 * Math.cos(((32.06 + 32.0609) / 2) * (Math.PI / 180));
  const at = (xM: number, yM: number) => [
    Math.round((xM / mPerDegLng) * 1e6),
    Math.round((yM / 111_320) * 1e6),
  ];
  const nodes = [
    at(0, 0),
    at(50, 0),
    at(100, 0),
    at(0, 100),
    at(50, 100),
    at(100, 100),
  ].flat();
  const edge = (a: number, b: number, m: number, shade: number) => [
    a,
    b,
    m * 10,
    shade,
  ];
  const raw: RawGraph = {
    area: "test",
    bbox: [34.8, 32.06, 34.802, 32.062],
    origin,
    nodes,
    edges: [
      edge(0, 1, 50, 0),
      edge(1, 2, 50, 0),
      edge(0, 3, 100, 100),
      edge(3, 4, 50, 100),
      edge(4, 5, 50, 100),
      edge(5, 2, 100, 100),
      edge(1, 4, 100, 0),
    ].flat(),
  };
  return new Graph(raw);
}

describe("edgeCost", () => {
  it("is the length when beta is 0 or the street is fully shaded", () => {
    expect(edgeCost(100, 0, 0)).toBe(100);
    expect(edgeCost(100, 1, 5)).toBe(100);
  });

  it("charges more for sun as beta grows", () => {
    expect(edgeCost(100, 0, 1)).toBe(200);
    expect(edgeCost(100, 0.5, 2)).toBe(200);
    expect(edgeCost(100, 0, 1, 2)).toBe(400);
  });
});

describe("findPath", () => {
  it("takes the short sunny street when shade does not matter", () => {
    const g = grid();
    const path = findPath(g, 0, 2, 0)!;
    expect(path.nodes).toEqual([0, 1, 2]);
    expect(measure(g, path)).toEqual({ length: 100, shade: 0 });
  });

  it("walks around through the shade when shade matters", () => {
    const g = grid();
    const path = findPath(g, 0, 2, 3)!;
    expect(path.nodes).toEqual([0, 3, 4, 5, 2]);
    expect(measure(g, path)).toEqual({ length: 300, shade: 1 });
  });

  it("is empty from a node to itself", () => {
    expect(findPath(grid(), 4, 4, 1)).toEqual({ nodes: [4], edges: [] });
  });
});

describe("routeToDestination", () => {
  it("returns the shadiest first, labelled, with per-segment shade", () => {
    const g = grid();
    const from = { lng: g.lng[0], lat: g.lat[0] };
    const to = { lng: g.lng[2], lat: g.lat[2] };
    const routes = routeToDestination(g, from, to);

    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes[0].kind).toBe("shadiest");
    expect(routes[0].shade).toBe(1);
    expect(routes.at(-1)!.kind).toBe("fastest");
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].shade).toBeLessThanOrEqual(routes[i - 1].shade);
    }
    for (const route of routes) {
      expect(route.segment_shade).toHaveLength(
        route.geometry.coordinates.length - 1,
      );
    }
  });

  it("refuses points far outside the graph", () => {
    const g = grid();
    expect(() =>
      routeToDestination(
        g,
        { lat: 31.77, lng: 35.21 },
        { lat: g.lat[2], lng: g.lng[2] },
      ),
    ).toThrow(OutsideAreaError);
  });
});

describe("the Givatayim pilot graph", () => {
  let graph: Graph;
  let countTrees: (route: Route) => number;
  beforeAll(async () => {
    const givatayim = findCityConfig("givatayim")!;
    graph = await cityGraph(givatayim);
    const trees = await cityTrees(givatayim);
    countTrees = trees.countNear.bind(trees);
  });

  it("is loaded and has shade scores", () => {
    expect(graph.size).toBeGreaterThan(1000);
    let shaded = 0;
    for (let e = 0; e < graph.edgeCount; e++) if (graph.shade[e] > 0) shaded++;
    expect(shaded / graph.edgeCount).toBeGreaterThan(0.1);
  });

  it("finds 2 to 4 shade-ranked routes across the city", () => {
    // From near Borochov junction to Givatayim park.
    const routes = routeToDestination(
      graph,
      { lat: 32.0647, lng: 34.8074 },
      { lat: 32.0776, lng: 34.8142 },
      countTrees,
    );
    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes.length).toBeLessThanOrEqual(4);
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].shade).toBeLessThanOrEqual(routes[i - 1].shade);
    }
    expect(routes[0].trees).toBeGreaterThan(0);
  });

  it("finds loops close to the asked length", () => {
    const target = { unit: "minutes" as const, value: 30 };
    const routes = freeWalk(graph, PILOT_AREA.center, target);
    const wanted = targetToMeters(target);
    expect(routes.length).toBeGreaterThanOrEqual(1);
    for (const route of routes) {
      expect(route.kind).toBe("loop");
      expect(Math.abs(route.distance_m - wanted) / wanted).toBeLessThanOrEqual(
        0.2,
      );
      const coords = route.geometry.coordinates;
      expect(coords[0]).toEqual(coords.at(-1));
    }
  });
});

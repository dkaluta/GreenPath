import type { Route } from "@shared/schemas/route";
import { describe, expect, it } from "vitest";
import { routeIdOf, routeToLines } from "./mapLines";

function route(shade: number[]): Route {
  return {
    id: "d0",
    kind: "shadiest",
    geometry: {
      type: "LineString",
      coordinates: Array.from({ length: shade.length + 1 }, (_, i) => [
        34.8 + i / 1000,
        32.07,
      ]),
    },
    distance_m: 100,
    duration_s: 75,
    shade: 0.5,
    segment_shade: shade,
    trees: 0,
  };
}

describe("routeToLines", () => {
  it("makes one line per run of shade or sun, sharing end points", () => {
    const lines = routeToLines(route([1, 0.8, 0.1, 0, 0.6]));
    expect(lines.map((l) => l.kind)).toEqual(["shade", "sun", "shade"]);
    expect(lines.map((l) => l.coordinates.length)).toEqual([3, 3, 2]);
    expect(lines[0].coordinates.at(-1)).toEqual(lines[1].coordinates[0]);
    expect(lines[1].coordinates.at(-1)).toEqual(lines[2].coordinates[0]);
  });

  it("keeps a single-run route whole, and passes dimmed on", () => {
    const lines = routeToLines(route([0, 0, 0]), true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: "sun", dimmed: true });
    expect(lines[0].coordinates).toHaveLength(4);
  });

  it("gives ids that lead back to the route", () => {
    for (const line of routeToLines(route([1, 0]))) {
      expect(routeIdOf(line.id)).toBe("d0");
    }
  });
});

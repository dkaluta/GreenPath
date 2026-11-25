import { describe, expect, it } from "vitest";
import {
  isInPilotArea,
  PILOT_AREA,
  routeRequestSchema,
  routeSchema,
  targetToMeters,
  WALK_LIMITS,
} from "./route";
import { treesQuerySchema } from "./tree";

const from = { lat: 32.07, lng: 34.81 };

describe("routeRequestSchema", () => {
  it("accepts a destination request", () => {
    const result = routeRequestSchema.safeParse({
      kind: "destination",
      from,
      to: { lat: 32.075, lng: 34.812 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a free walk in each unit at its initial value", () => {
    for (const [unit, limits] of Object.entries(WALK_LIMITS)) {
      const result = routeRequestSchema.safeParse({
        kind: "free",
        from,
        target: { unit, value: limits.initial },
      });
      expect(result.success, unit).toBe(true);
    }
  });

  it("rejects a walk outside the counter's limits", () => {
    const result = routeRequestSchema.safeParse({
      kind: "free",
      from,
      target: { unit: "minutes", value: 600 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a destination request without a destination", () => {
    expect(
      routeRequestSchema.safeParse({ kind: "destination", from }).success,
    ).toBe(false);
  });
});

describe("targetToMeters", () => {
  it("converts each unit", () => {
    expect(targetToMeters({ unit: "meters", value: 2000 })).toBe(2000);
    expect(targetToMeters({ unit: "steps", value: 4000 })).toBe(3000);
    expect(targetToMeters({ unit: "minutes", value: 30 })).toBeCloseTo(2394);
  });
});

describe("routeSchema", () => {
  it("rejects shade outside 0 to 1", () => {
    const route = {
      id: "d0",
      kind: "shadiest",
      geometry: {
        type: "LineString",
        coordinates: [
          [34.8, 32.06],
          [34.81, 32.07],
        ],
      },
      distance_m: 100,
      duration_s: 75,
      shade: 1.2,
      segment_shade: [1],
      trees: 0,
    };
    expect(routeSchema.safeParse(route).success).toBe(false);
    expect(routeSchema.safeParse({ ...route, shade: 0.8 }).success).toBe(true);
  });
});

describe("isInPilotArea", () => {
  it("knows Givatayim from Jerusalem", () => {
    expect(isInPilotArea(PILOT_AREA.center)).toBe(true);
    expect(isInPilotArea({ lat: 31.77, lng: 35.21 })).toBe(false);
  });
});

describe("treesQuerySchema", () => {
  it("parses a bbox", () => {
    const result = treesQuerySchema.parse({ bbox: "34.80,32.06,34.81,32.07" });
    expect(result.bbox).toEqual([34.8, 32.06, 34.81, 32.07]);
  });

  it("rejects a malformed or huge box", () => {
    expect(treesQuerySchema.safeParse({ bbox: "1,2,3" }).success).toBe(false);
    expect(
      treesQuerySchema.safeParse({ bbox: "34.81,32.06,34.80,32.07" }).success,
    ).toBe(false);
    expect(treesQuerySchema.safeParse({ bbox: "34,32,35,33" }).success).toBe(
      false,
    );
  });
});

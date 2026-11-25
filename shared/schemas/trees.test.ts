import { describe, expect, it } from "vitest";
import { createReportSchema } from "./report";
import { createVerificationSchema } from "./verification";
import { createWalkSchema } from "./walk";

const USER = "11111111-1111-4111-8111-111111111111";
const PHOTO = `${USER}/33333333-3333-4333-8333-333333333333.jpg`;

describe("createReportSchema", () => {
  it("accepts a damaged tree by id", () => {
    expect(
      createReportSchema.safeParse({ kind: "damaged", tree_id: "yaad-1" })
        .success,
    ).toBe(true);
  });

  it("needs a location for a tree missing from the map", () => {
    const result = createReportSchema.safeParse({
      kind: "missing_from_map",
      tree_id: "yaad-1",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["location"]);
  });

  it("needs a tree or a location", () => {
    expect(createReportSchema.safeParse({ kind: "gone" }).success).toBe(false);
  });

  it("rejects a latitude off the planet", () => {
    expect(
      createReportSchema.safeParse({
        kind: "gone",
        location: { lat: 120, lng: 34 },
      }).success,
    ).toBe(false);
  });
});

describe("createVerificationSchema", () => {
  const valid = {
    tree_id: "yaad-1",
    answer: "same",
    tree_photo_path: PHOTO,
  };

  it("accepts an answer with a photo", () => {
    expect(createVerificationSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts 'no tree here' without photos", () => {
    expect(
      createVerificationSchema.safeParse({
        tree_id: "yaad-1",
        answer: "no_tree",
      }).success,
    ).toBe(true);
  });

  it("needs a photo for any other answer", () => {
    const result = createVerificationSchema.safeParse({
      tree_id: "yaad-1",
      answer: "different",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["tree_photo_path"]);
  });

  it("rejects a photo path that did not come from the upload flow", () => {
    expect(
      createVerificationSchema.safeParse({
        ...valid,
        tree_photo_path: "../../etc/passwd",
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown answer", () => {
    expect(
      createVerificationSchema.safeParse({ ...valid, answer: "maybe" }).success,
    ).toBe(false);
  });
});

describe("createWalkSchema", () => {
  const walk = {
    distance_m: 1200,
    steps: 1640,
    shade_share: 0.78,
    started_at: "2026-11-25T10:00:00.000Z",
    ended_at: "2026-11-25T10:30:00.000Z",
  };

  it("accepts a walk", () => {
    expect(createWalkSchema.safeParse(walk).success).toBe(true);
  });

  it("accepts a walk without shade data", () => {
    expect(
      createWalkSchema.safeParse({ ...walk, shade_share: null }).success,
    ).toBe(true);
  });

  it("rejects a shade share above 100%", () => {
    expect(
      createWalkSchema.safeParse({ ...walk, shade_share: 1.2 }).success,
    ).toBe(false);
  });

  it("rejects a walk longer than a day", () => {
    expect(
      createWalkSchema.safeParse({
        ...walk,
        ended_at: "2026-11-27T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});

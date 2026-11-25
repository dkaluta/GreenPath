import { describe, expect, it } from "vitest";
import { generateUsername, usernameSchema } from "./profile";

describe("usernameSchema", () => {
  it.each(["gentle shady olive", "calm oak", "kind misty owl walker"])(
    "accepts %s",
    (name) => {
      expect(usernameSchema.safeParse(name).success).toBe(true);
    },
  );

  it.each([
    ["an email address", "someone@example.com"],
    ["a single word", "olive"],
    ["capital letters", "Gentle Shady Olive"],
    ["two spaces in a row", "gentle  olive"],
    ["a leading space", " gentle olive"],
    ["digits", "gentle olive 42"],
    ["Hebrew", "עץ ירוק"],
    ["too many words", "a b c d e"],
  ])("rejects %s", (_why, name) => {
    expect(usernameSchema.safeParse(name).success).toBe(false);
  });
});

describe("generateUsername", () => {
  it("makes three valid words, whatever the dice say", () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      const name = generateUsername(() => r);
      expect(name.split(" ")).toHaveLength(3);
      expect(usernameSchema.safeParse(name).success).toBe(true);
    }
  });

  it("picks the first word of each list for 0", () => {
    expect(generateUsername(() => 0)).toBe("calm shady olive");
  });
});

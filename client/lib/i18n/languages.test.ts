import { describe, expect, it } from "vitest";
import { pickLanguage } from "./languages";

describe("pickLanguage", () => {
  it("uses the saved choice first", () => {
    expect(pickLanguage("ar", ["en-US"])).toBe("ar");
  });

  it("ignores a saved value we do not speak", () => {
    expect(pickLanguage("fr", ["en-GB"])).toBe("en");
  });

  it("matches the browser's languages by their base", () => {
    expect(pickLanguage(null, ["fr-FR", "ar-EG", "en"])).toBe("ar");
  });

  it("understands the old Hebrew code", () => {
    expect(pickLanguage(null, ["iw-IL"])).toBe("he");
  });

  it("falls back to Hebrew", () => {
    expect(pickLanguage(null, ["fr", "de"])).toBe("he");
    expect(pickLanguage(null, [])).toBe("he");
  });
});

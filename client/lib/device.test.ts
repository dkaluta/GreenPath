import { describe, expect, it } from "vitest";
import { isMobileDevice } from "./device";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

describe("isMobileDevice", () => {
  it("trusts the browser's own answer first", () => {
    expect(
      isMobileDevice({
        uaDataMobile: false,
        userAgent: ANDROID,
        touchOnly: true,
      }),
    ).toBe(false);
    expect(
      isMobileDevice({ uaDataMobile: true, userAgent: MAC, touchOnly: false }),
    ).toBe(true);
  });

  it("accepts a phone with a touch screen", () => {
    expect(isMobileDevice({ userAgent: IPHONE, touchOnly: true })).toBe(true);
    expect(isMobileDevice({ userAgent: ANDROID, touchOnly: true })).toBe(true);
  });

  it("rejects a desktop", () => {
    expect(isMobileDevice({ userAgent: MAC, touchOnly: false })).toBe(false);
  });

  it("rejects a phone user agent without a touch screen (desktop emulation)", () => {
    expect(isMobileDevice({ userAgent: IPHONE, touchOnly: false })).toBe(false);
  });
});

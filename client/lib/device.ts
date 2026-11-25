/**
 * Which device are we on?
 *
 * Turn-by-turn navigation is a product rule: it only runs on a phone - mobile
 * web here, and the future React Native app (which never loads this file, so
 * it does not need a check). See "Turn-by-turn navigation is mobile only" in
 * docs/00-product.markdown.
 */

/** What the browser tells us. Passed in, so the rule can be tested. */
export type DeviceSignals = {
  /** navigator.userAgentData.mobile, where the browser has it (Chromium). */
  uaDataMobile?: boolean;
  /** navigator.userAgent. */
  userAgent: string;
  /** True when the main pointer is a finger and there is no hover. */
  touchOnly: boolean;
};

const MOBILE_UA = /Android.+Mobile|iPhone|iPod|Windows Phone|Mobile Safari/i;

/**
 * The rule itself. A tablet counts as mobile only if it says so, so an iPad
 * on a desk does not get turn-by-turn by accident.
 */
export function isMobileDevice(signals: DeviceSignals): boolean {
  // The browser's own answer is the most honest one, so it wins.
  if (signals.uaDataMobile !== undefined) return signals.uaDataMobile;
  return MOBILE_UA.test(signals.userAgent) && signals.touchOnly;
}

/** Reads the signals from the real browser. */
export function readDeviceSignals(): DeviceSignals {
  const nav = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  return {
    uaDataMobile: nav.userAgentData?.mobile,
    userAgent: nav.userAgent,
    touchOnly: window.matchMedia("(pointer: coarse) and (hover: none)").matches,
  };
}

/** Can this device run turn-by-turn navigation? */
export function canNavigateHere(): boolean {
  return isMobileDevice(readDeviceSignals());
}

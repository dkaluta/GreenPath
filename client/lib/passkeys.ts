/*
 * Small, pure helpers for the sign-in screen: can this browser use passkeys,
 * and what went wrong when something failed. Kept apart from auth.tsx so
 * they can be tested without a browser.
 */

export type PasskeySupport = "supported" | "insecure" | "unsupported";

/**
 * Whether this browser can use passkeys at all.
 *
 * "insecure" means the browser would support them but the page is not on
 * https (or localhost): browsers hide WebAuthn there, so the fix is the
 * address, not the browser.
 */
export function passkeySupport(
  win: {
    isSecureContext?: boolean;
    PublicKeyCredential?: unknown;
    navigator?: { credentials?: unknown };
  } = window,
): PasskeySupport {
  if (win.isSecureContext === false) return "insecure";
  if (typeof win.PublicKeyCredential !== "function") return "unsupported";
  if (!win.navigator?.credentials) return "unsupported";
  return "supported";
}

/** The kinds of failure the sign-in screen explains, each with its own text. */
export type AuthErrorKind =
  | "cancelled"
  | "alreadyRegistered"
  | "unknownPasskey"
  | "expired"
  | "verificationFailed"
  | "passkeysOff"
  | "wrongSite"
  | "badCode"
  | "badEmail"
  | "tooManyTries"
  | "wrongAccount"
  | "generic";

const BY_CODE: Record<string, AuthErrorKind> = {
  // From the browser's WebAuthn ceremony (supabase-js WebAuthnError codes).
  ERROR_CEREMONY_ABORTED: "cancelled",
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED: "alreadyRegistered",
  ERROR_INVALID_DOMAIN: "wrongSite",
  ERROR_INVALID_RP_ID: "wrongSite",
  // From Supabase Auth.
  webauthn_credential_exists: "alreadyRegistered",
  webauthn_credential_not_found: "unknownPasskey",
  webauthn_challenge_not_found: "expired",
  webauthn_challenge_expired: "expired",
  webauthn_verification_failed: "verificationFailed",
  passkey_disabled: "passkeysOff",
  otp_expired: "badCode",
  email_address_invalid: "badEmail",
  validation_failed: "badEmail",
  over_email_send_rate_limit: "tooManyTries",
  over_request_rate_limit: "tooManyTries",
  // Ours: the passkey picked belongs to a different email (client/lib/auth.tsx).
  wrong_account: "wrongAccount",
};

/** The browser's own names for the same failures (DOMException.name). */
const BY_NAME: Record<string, AuthErrorKind> = {
  // Cancelled, timed out, or no passkey chosen. Browsers deliberately do
  // not say which.
  NotAllowedError: "cancelled",
  AbortError: "cancelled",
  InvalidStateError: "alreadyRegistered",
  SecurityError: "wrongSite",
};

/** Sorts any error from sign-in into one the screen can explain. */
export function authErrorKind(error: unknown): AuthErrorKind {
  if (typeof error !== "object" || error === null) return "generic";
  const { code, name, cause } = error as {
    code?: unknown;
    name?: unknown;
    cause?: unknown;
  };
  if (typeof code === "string" && code in BY_CODE) return BY_CODE[code];
  if (typeof name === "string" && name in BY_NAME) return BY_NAME[name];
  // supabase-js wraps the browser's error; look inside once.
  if (cause && cause !== error) {
    const inner = authErrorKind(cause);
    if (inner !== "generic") return inner;
  }
  return "generic";
}

/** A one-time code as people type it: digits only, spaces and dashes dropped. */
export function cleanCode(input: string): string {
  return input.replace(/\D/g, "");
}

/** Supabase sends 6-digit codes by default; projects can set up to 10. */
export function isPlausibleCode(code: string): boolean {
  return /^\d{6,10}$/.test(code);
}

/** True when two emails are the same address, ignoring case and spaces. */
export function sameEmail(a: string | undefined, b: string): boolean {
  return (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();
}

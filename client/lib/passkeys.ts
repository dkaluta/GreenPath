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
  | "tooManyPasskeys"
  | "generic";

const BY_CODE: Record<string, AuthErrorKind> = {
  // From the browser's WebAuthn ceremony (supabase-js WebAuthnError codes).
  ERROR_CEREMONY_ABORTED: "cancelled",
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED: "alreadyRegistered",
  ERROR_INVALID_DOMAIN: "wrongSite",
  ERROR_INVALID_RP_ID: "wrongSite",
  // From Supabase Auth.
  webauthn_credential_exists: "alreadyRegistered",
  too_many_passkeys: "tooManyPasskeys",
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

/*
 * The sign-up and recovery email has a link in it (and, with a custom
 * template, a code). Following the link reloads the app, maybe in a new tab,
 * so where the person was in the flow is saved here and read back by
 * client/pages/auth/AuthCallbackPage.tsx. It holds no email.
 */

export type EmailFlow = { mode: "signUp" | "recover"; from: string };

const FLOW_KEY = "greenpath.emailFlow";
/** Supabase's email links last an hour by default. */
const FLOW_MAX_AGE_MS = 60 * 60 * 1000;

type FlowStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveEmailFlow(
  storage: FlowStorage,
  flow: EmailFlow,
  now = Date.now(),
) {
  try {
    storage.setItem(FLOW_KEY, JSON.stringify({ ...flow, at: now }));
  } catch {
    // Private browsing may refuse storage. The link still signs them in;
    // they just start from the passkey step.
  }
}

/** Reads the saved flow once, then forgets it. Null if none or too old. */
export function takeEmailFlow(
  storage: FlowStorage,
  now = Date.now(),
): EmailFlow | null {
  let raw: string | null;
  try {
    raw = storage.getItem(FLOW_KEY);
    storage.removeItem(FLOW_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<EmailFlow & { at: number }>;
    if (value.mode !== "signUp" && value.mode !== "recover") return null;
    if (typeof value.at !== "number" || now - value.at > FLOW_MAX_AGE_MS) {
      return null;
    }
    // Only paths inside the app, never another site.
    const from =
      typeof value.from === "string" && /^\/(?!\/)/.test(value.from)
        ? value.from
        : "/";
    return { mode: value.mode, from };
  } catch {
    return null;
  }
}

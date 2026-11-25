import { describe, expect, it } from "vitest";
import {
  authErrorKind,
  cleanCode,
  isPlausibleCode,
  passkeySupport,
  sameEmail,
  saveEmailFlow,
  takeEmailFlow,
} from "./passkeys";

class FakePublicKeyCredential {}

describe("passkeySupport", () => {
  it("is supported with WebAuthn on a secure page", () => {
    expect(
      passkeySupport({
        isSecureContext: true,
        PublicKeyCredential: FakePublicKeyCredential,
        navigator: { credentials: {} },
      }),
    ).toBe("supported");
  });

  it("says insecure on a plain-http page", () => {
    expect(
      passkeySupport({
        isSecureContext: false,
        navigator: { credentials: {} },
      }),
    ).toBe("insecure");
  });

  it("says unsupported when the browser has no WebAuthn", () => {
    expect(
      passkeySupport({ isSecureContext: true, navigator: { credentials: {} } }),
    ).toBe("unsupported");
    expect(
      passkeySupport({
        isSecureContext: true,
        PublicKeyCredential: FakePublicKeyCredential,
        navigator: {},
      }),
    ).toBe("unsupported");
  });
});

describe("authErrorKind", () => {
  it.each([
    [{ code: "ERROR_CEREMONY_ABORTED" }, "cancelled"],
    [{ name: "NotAllowedError" }, "cancelled"],
    [{ code: "webauthn_credential_not_found" }, "unknownPasskey"],
    [{ code: "webauthn_credential_exists" }, "alreadyRegistered"],
    [
      { code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" },
      "alreadyRegistered",
    ],
    [{ code: "webauthn_challenge_expired" }, "expired"],
    [{ code: "webauthn_verification_failed" }, "verificationFailed"],
    [{ code: "passkey_disabled" }, "passkeysOff"],
    [{ code: "ERROR_INVALID_RP_ID" }, "wrongSite"],
    [{ code: "otp_expired" }, "badCode"],
    [{ code: "email_address_invalid" }, "badEmail"],
    [{ code: "over_email_send_rate_limit" }, "tooManyTries"],
    [{ code: "wrong_account" }, "wrongAccount"],
    [{ code: "too_many_passkeys" }, "tooManyPasskeys"],
  ])("sorts %o as %s", (error, kind) => {
    expect(authErrorKind(error)).toBe(kind);
  });

  it("looks inside a wrapped browser error", () => {
    expect(
      authErrorKind({
        code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
        cause: { name: "NotAllowedError" },
      }),
    ).toBe("cancelled");
  });

  it.each([null, undefined, "oops", 42, new Error("boom"), { code: "nope" }])(
    "falls back to generic for %o",
    (error) => {
      expect(authErrorKind(error)).toBe("generic");
    },
  );

  it("does not loop on an error that is its own cause", () => {
    const error: { code: string; cause?: unknown } = { code: "x" };
    error.cause = error;
    expect(authErrorKind(error)).toBe("generic");
  });
});

describe("one-time codes", () => {
  it("keeps only digits", () => {
    expect(cleanCode(" 123-456 ")).toBe("123456");
    expect(cleanCode("١٢٣")).toBe("");
  });

  it("accepts 6 to 10 digits", () => {
    expect(isPlausibleCode("123456")).toBe(true);
    expect(isPlausibleCode("1234567890")).toBe(true);
    expect(isPlausibleCode("12345")).toBe(false);
    expect(isPlausibleCode("12345678901")).toBe(false);
  });
});

describe("sameEmail", () => {
  it("ignores case and surrounding spaces", () => {
    expect(sameEmail("Dana@Example.com", " dana@example.com ")).toBe(true);
  });
  it("tells different addresses apart", () => {
    expect(sameEmail("dana@example.com", "dan@example.com")).toBe(false);
    expect(sameEmail(undefined, "dana@example.com")).toBe(false);
  });
});

describe("email flow storage", () => {
  function memoryStorage() {
    const items = new Map<string, string>();
    return {
      items,
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
      removeItem: (key: string) => void items.delete(key),
    };
  }

  it("reads back what was saved, once", () => {
    const storage = memoryStorage();
    saveEmailFlow(storage, { mode: "signUp", from: "/collection" }, 1000);
    expect(takeEmailFlow(storage, 2000)).toEqual({
      mode: "signUp",
      from: "/collection",
    });
    expect(takeEmailFlow(storage, 2000)).toBeNull();
  });

  it("forgets a flow older than an hour", () => {
    const storage = memoryStorage();
    saveEmailFlow(storage, { mode: "recover", from: "/" }, 0);
    expect(takeEmailFlow(storage, 61 * 60 * 1000)).toBeNull();
  });

  it("never sends the person to another site", () => {
    const storage = memoryStorage();
    saveEmailFlow(storage, { mode: "recover", from: "//evil.example" }, 0);
    expect(takeEmailFlow(storage, 0)?.from).toBe("/");
  });

  it("ignores junk", () => {
    const storage = memoryStorage();
    storage.setItem("greenpath.emailFlow", "{not json");
    expect(takeEmailFlow(storage)).toBeNull();
    storage.setItem("greenpath.emailFlow", JSON.stringify({ mode: "x" }));
    expect(takeEmailFlow(storage)).toBeNull();
  });

  it("copes with storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {},
    };
    expect(() =>
      saveEmailFlow(broken, { mode: "signUp", from: "/" }),
    ).not.toThrow();
    expect(takeEmailFlow(broken)).toBeNull();
  });
});

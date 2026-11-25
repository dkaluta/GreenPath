import { useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Button, Field, Input, Spinner } from "../../components";
import { MapScreen } from "../../features/map";
import { useAuth } from "../../lib/auth";
import { SUPABASE_ENABLED } from "../../lib/config";
import { t } from "../../lib/i18n";
import {
  authErrorKind,
  cleanCode,
  isPlausibleCode,
  passkeySupport,
} from "../../lib/passkeys";
import styles from "./SignInPage.module.css";

/*
 * Sign in and sign up, with passkeys. The steps:
 *
 *   signIn ─► (email + passkey) ─► done
 *     ├─► email (sign up) ─► link/code ─► username ─► passkey ─► done
 *     └─► email (recover) ─► link/code ───────────► passkey ─► done
 *
 * Signed in already, "Add a passkey" in the footer opens the passkey step on
 * its own (mode "add"): one account can have a passkey on every device.
 *
 * Supabase's own email has only a link, which lands on /auth/callback and
 * comes back here at the right step. A custom template can add a code, typed
 * on the "code" step. The email is only used for this, and is never shown
 * back on screen.
 */
type Step = "signIn" | "email" | "code" | "username" | "passkey";
/** "add" is a signed-in person adding another passkey (another device). */
type Mode = "signUp" | "recover" | "add";

// Read once: whether WebAuthn exists does not change while the page is open.
const SUPPORT = passkeySupport();

export default function SignInPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Set by RequireAuth (where to go back to), and by the page the emailed
  // link lands on (client/pages/auth/AuthCallbackPage.tsx).
  const arrived = (location.state ?? {}) as {
    from?: string;
    step?: Step;
    mode?: Mode;
    linkFailed?: boolean;
  };
  const from = arrived.from ?? "/";

  const [step, setStep] = useState<Step>(arrived.step ?? "signIn");
  const [mode, setMode] = useState<Mode>(arrived.mode ?? "signUp");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    arrived.linkFailed ? t.auth.errors.linkFailed : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!SUPABASE_ENABLED) {
    return (
      <Frame title={t.auth.notSetUpTitle}>
        <p dir="auto">{t.auth.notSetUpBody}</p>
      </Frame>
    );
  }

  if (SUPPORT !== "supported") {
    return (
      <Frame title={t.auth.title}>
        <p role="alert" className={styles.error}>
          {t.auth.support[SUPPORT]}
        </p>
      </Frame>
    );
  }

  if (auth.loading) {
    return (
      <Frame title={t.auth.title}>
        <Spinner />
      </Frame>
    );
  }

  // Already signed in. Someone who has no passkey yet (they left half-way
  // through signing up) goes straight to making one; everyone else moves on.
  let current = step;
  // Adding a passkey needs someone signed in.
  if (mode === "add" && !auth.user) current = "signIn";
  if (auth.user && (step === "signIn" || step === "email" || step === "code")) {
    if (!auth.needsPasskey) return <Navigate to={from} replace />;
    current = "passkey";
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
    } catch (caught) {
      console.error(caught);
      setError(t.auth.errors[authErrorKind(caught)]);
    } finally {
      setBusy(false);
    }
  }

  function go(next: Step, nextMode: Mode = mode) {
    setError(null);
    setNotice(null);
    setMode(nextMode);
    setStep(next);
  }

  function onSignIn(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await auth.signInWithPasskey(email);
      navigate(from, { replace: true });
    });
  }

  function onSendCode(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await auth.sendEmailCode(email, mode === "signUp", from);
      setCode("");
      setStep("code");
    });
  }

  function onVerify(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await auth.verifyEmailCode(email, code);
      setStep(mode === "signUp" ? "username" : "passkey");
    });
  }

  const emailField = (
    <Field label={t.auth.emailLabel} description={t.auth.emailHelp}>
      <Input
        type="email"
        dir="ltr"
        // "webauthn" lets the browser offer saved passkeys from this box.
        autoComplete="email webauthn"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </Field>
  );

  const messages = (
    <>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      ) : null}
    </>
  );

  switch (current) {
    case "signIn":
      return (
        <Frame title={t.auth.title}>
          <p className={styles.intro}>{t.auth.intro}</p>
          <form onSubmit={onSignIn}>
            {emailField}
            <Button type="submit" loading={busy} className={styles.fullWidth}>
              {t.auth.signIn}
            </Button>
          </form>
          {messages}
          <div className={styles.links}>
            <p>
              {t.auth.noAccount}{" "}
              <button
                type="button"
                className={styles.link}
                onClick={() => go("email", "signUp")}
              >
                {t.auth.createAccount}
              </button>
            </p>
            <p>
              {t.auth.lostPasskey}{" "}
              <button
                type="button"
                className={styles.link}
                onClick={() => go("email", "recover")}
              >
                {t.auth.recover}
              </button>
            </p>
          </div>
        </Frame>
      );

    case "email":
      return (
        <Frame
          title={mode === "signUp" ? t.auth.signUpTitle : t.auth.recoverTitle}
        >
          <p className={styles.intro}>
            {mode === "signUp" ? t.auth.signUpIntro : t.auth.recoverIntro}
          </p>
          <form onSubmit={onSendCode}>
            {emailField}
            <div className={styles.actions}>
              <Button type="submit" loading={busy} className={styles.grow}>
                {t.auth.sendCode}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => go("signIn")}
              >
                {t.auth.back}
              </Button>
            </div>
          </form>
          {messages}
        </Frame>
      );

    case "code":
      return (
        <Frame title={t.auth.codeTitle}>
          <p className={styles.intro}>{t.auth.codeSent}</p>
          <form onSubmit={onVerify}>
            <Field label={t.auth.codeLabel}>
              <Input
                dir="ltr"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(event) => setCode(cleanCode(event.target.value))}
              />
            </Field>
            <div className={styles.actions}>
              <Button
                type="submit"
                loading={busy}
                disabled={!isPlausibleCode(code)}
                className={styles.grow}
              >
                {t.auth.verify}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => go("email")}
              >
                {t.auth.back}
              </Button>
            </div>
          </form>
          <button
            type="button"
            className={styles.link}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await auth.sendEmailCode(email, mode === "signUp", from);
                setNotice(t.auth.resent);
              })
            }
          >
            {t.auth.resend}
          </button>
          {messages}
        </Frame>
      );

    case "username":
      return (
        <Frame title={t.auth.usernameTitle}>
          <p className={styles.intro}>{t.auth.usernameIntro}</p>
          <p
            className={styles.username}
            dir="ltr"
            aria-label={t.auth.usernameLabel}
            aria-live="polite"
          >
            {auth.profile?.username ?? <Spinner />}
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              loading={busy}
              disabled={!auth.profile}
              onClick={() => void run(auth.rerollUsername)}
            >
              {t.auth.reroll}
            </Button>
            <Button
              type="button"
              className={styles.grow}
              disabled={busy || !auth.profile}
              onClick={() => go("passkey")}
            >
              {t.auth.continue}
            </Button>
          </div>
          {messages}
        </Frame>
      );

    case "passkey": {
      const adding = mode === "add" && !auth.needsPasskey;
      return (
        <Frame title={adding ? t.auth.addPasskeyTitle : t.auth.passkeyTitle}>
          <p className={styles.intro}>
            {adding ? t.auth.addPasskeyIntro : t.auth.passkeyIntro}
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              className={styles.grow}
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await auth.registerPasskey();
                  navigate(from, { replace: true });
                })
              }
            >
              {t.auth.createPasskey}
            </Button>
            {adding ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => navigate(from, { replace: true })}
              >
                {t.auth.back}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await auth.signOut();
                    go("signIn");
                  })
                }
              >
                {t.nav.signOut}
              </Button>
            )}
          </div>
          {messages}
        </Frame>
      );
    }
  }
}

/**
 * Every step in the app's map frame: the floating panel over the map on
 * desktop, a full page on phones.
 */
function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MapScreen title={title} phone="page">
      <div>{children}</div>
    </MapScreen>
  );
}

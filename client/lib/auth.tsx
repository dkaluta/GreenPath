// This file deliberately keeps the whole login story in one place: the
// provider, the hook that reads it, and the route guard. That trips a rule
// about hot-reloading, whose only cost is that editing THIS file reloads the
// page instead of patching it. Worth it for having one file to read.
/* eslint-disable react-refresh/only-export-components */
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@shared/schemas/profile";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { api } from "./api";
import { SUPABASE_ENABLED } from "./config";
import { t } from "./i18n";
import { sameEmail } from "./passkeys";
import { supabase } from "./supabase";

/*
 * How signing in works (Supabase Auth with passkeys; see
 * docs/02-supabase-setup.markdown):
 *
 * - Sign up: an email, a one-time code sent to it, a generated username,
 *   then a passkey on this device.
 * - Sign in: the email, then the passkey.
 * - Lost the passkey, or on a new device: the email and a code again, then
 *   a new passkey.
 *
 * The email is only ever used for those codes. It is never shown on screen,
 * and the server never returns it (docs/00-product.markdown).
 */

type AuthState = {
  /** The signed-in person, or null if nobody is signed in. */
  user: { id: string } | null;
  /** Their pseudonymous username, once the server has sent it. */
  profile: Profile | null;
  /**
   * True when someone is signed in (with an email code) but has no passkey
   * yet. They are sent back to /signin to make one before going on.
   */
  needsPasskey: boolean;
  /** True while we are still checking. Show a spinner, not a login form. */
  loading: boolean;

  /** Opens the browser's passkey prompt and signs in as `email`. */
  signInWithPasskey: (email: string) => Promise<void>;
  /**
   * Emails a one-time code. `create` is true when signing up; when false
   * and no account has that email, nothing is sent, and we still say "sent"
   * so the screen does not reveal who has an account.
   */
  sendEmailCode: (email: string, create: boolean) => Promise<void>;
  /** Checks the code from the email, and signs in. */
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  /** Saves a new passkey for the signed-in person, on this device. */
  registerPasskey: () => Promise<void>;
  /** A new generated username. */
  rerollUsername: () => Promise<void>;
  signOut: () => Promise<void>;
};

type Account = {
  userId: string;
  profile: Profile | null;
  passkeyCount: number;
};

const AuthContext = createContext<AuthState | null>(null);

/** Thrown when the passkey chosen belongs to a different email. */
export class WrongAccountError extends Error {
  readonly code = "wrong_account";
  constructor() {
    super("That passkey belongs to a different account.");
    this.name = "WrongAccountError";
  }
}

/**
 * Keeps track of who is signed in, for the whole app.
 * It is wrapped around everything in client/App.tsx.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // If Supabase isn't configured yet there is nothing to check, so we are
  // never "loading".
  const [sessionLoading, setSessionLoading] = useState(SUPABASE_ENABLED);
  // The signed-in person's username and passkey count, tagged with whose
  // they are, so a stale answer for someone who just signed out is ignored.
  const [account, setAccount] = useState<Account | null>(null);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        setSession(next);
        setSessionLoading(false);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Once someone is signed in: their username (the server makes one the
  // first time), and whether they have a passkey yet.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([api<Profile>("/api/me"), supabase.auth.passkey.list()])
      .then(([profile, passkeys]) => {
        if (cancelled) return;
        // If the list fails, assume they have one rather than lock them out.
        const passkeyCount = passkeys.error ? 1 : passkeys.data.length;
        setAccount({ userId, profile, passkeyCount });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Could not load the profile:", error);
        setAccount({ userId, profile: null, passkeyCount: 1 });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = useMemo(() => (userId ? { id: userId } : null), [userId]);
  const current = account && account.userId === userId ? account : null;
  const profile = current?.profile ?? null;
  const passkeyCount = current?.passkeyCount ?? null;
  const loading = sessionLoading || (user !== null && current === null);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      needsPasskey: user !== null && passkeyCount === 0,
      loading,

      async signInWithPasskey(email) {
        const { data, error } = await supabase.auth.signInWithPasskey();
        if (error) throw error;
        // The browser lets the person pick any passkey it has for this site.
        // Make sure it is the account they said.
        if (!sameEmail(data.user?.email, email)) {
          await supabase.auth.signOut();
          throw new WrongAccountError();
        }
      },

      async sendEmailCode(email, create) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: create },
        });
        if (!error) return;
        // Recovering an address with no account: say nothing different.
        if (!create && error.code === "otp_disabled") return;
        throw error;
      },

      async verifyEmailCode(email, code) {
        const { error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code,
          type: "email",
        });
        if (error) throw error;
      },

      async registerPasskey() {
        const { error } = await supabase.auth.registerPasskey();
        if (error) throw error;
        setAccount(
          (old) => old && { ...old, passkeyCount: old.passkeyCount + 1 },
        );
      },

      async rerollUsername() {
        const next = await api<Profile>("/api/me/username/reroll", {
          method: "POST",
        });
        setAccount((old) => old && { ...old, profile: next });
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [user, profile, passkeyCount, loading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Read the signed-in person from anywhere: `const { user } = useAuth();` */
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}

/**
 * Put routes inside this to require a login for all of them:
 *
 *     <Route element={<RequireAuth />}>
 *       <Route path="/events" element={<EventsPage />} />
 *     </Route>
 *
 * Someone signed in without a passkey yet is sent to make one first.
 */
export function RequireAuth() {
  const { user, loading, needsPasskey } = useAuth();
  const location = useLocation();

  if (loading) return <main>{t.auth.loading}</main>;

  if (!user || needsPasskey) {
    // Remember where they were heading, so we can send them back after.
    return (
      <Navigate to="/signin" state={{ from: location.pathname }} replace />
    );
  }

  return <Outlet />;
}

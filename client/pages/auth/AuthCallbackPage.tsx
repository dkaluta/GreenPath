import { Navigate } from "react-router";
import { Spinner } from "../../components";
import { useAuth } from "../../lib/auth";
import { takeEmailFlow } from "../../lib/passkeys";

/**
 * Where the link in the sign-up or recovery email lands.
 *
 * The Supabase client is set up with `detectSessionInUrl`, so it reads the
 * login out of the URL by itself. We wait for that, then send the person on
 * to the next step of the flow they started: choosing a username (sign-up)
 * or making a passkey (recovery). See client/pages/signin/SignInPage.tsx.
 */
export default function AuthCallbackPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main>
        <Spinner />
      </main>
    );
  }

  if (!user) {
    // Expired, already used, or opened in a browser that blocks storage.
    return <Navigate to="/signin" replace state={{ linkFailed: true }} />;
  }

  const flow = takeEmailFlow(localStorage);
  return (
    <Navigate
      to="/signin"
      replace
      state={{
        step: flow?.mode === "signUp" ? "username" : "passkey",
        mode: flow?.mode ?? "recover",
        from: flow?.from ?? "/",
      }}
    />
  );
}

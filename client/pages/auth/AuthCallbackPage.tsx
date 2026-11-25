import { Navigate } from "react-router";

/**
 * Where Google and email-confirmation links used to send the browser back.
 *
 * Sign-in no longer leaves the page (passkeys, and emailed codes for
 * recovery), so nothing lands here any more. It stays only so that an old
 * link still goes somewhere sensible.
 */
export default function AuthCallbackPage() {
  return <Navigate to="/signin" replace />;
}

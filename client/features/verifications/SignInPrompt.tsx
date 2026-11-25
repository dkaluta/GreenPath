import { Link, useLocation } from "react-router";
import { t } from "../../lib/i18n";
import styles from "./SignInPrompt.module.css";

/**
 * Shown where helping the map needs a login: reports and verifications are
 * saved under the person's username. Sends them back here after signing in.
 */
export function SignInPrompt({ message }: { message?: string }) {
  const location = useLocation();
  return (
    <div className={styles.prompt}>
      <p className={styles.title}>{message ?? t.verify.signInTitle}</p>
      <p className={styles.body}>{t.verify.signInBody}</p>
      <Link
        to="/signin"
        state={{ from: location.pathname }}
        className={styles.link}
      >
        {t.verify.signIn}
      </Link>
    </div>
  );
}

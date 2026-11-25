import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Spinner } from "../components";
import { useAuth } from "../lib/auth";
import { COURSE_CREDITS, COURSE_GITHUB, SHOW_DEMOS } from "../lib/config";
import { LANG } from "../lib/config";
import { LANGUAGES, setLanguage, t, type Lang } from "../lib/i18n";
import styles from "./Layout.module.css";

/**
 * Screens that are a full-screen map, without the header and footer. Add a
 * map screen's path here (for example "/route" once it shows a map).
 */
const FULL_BLEED_PATHS = ["/"];

/**
 * The frame around every page: the bar at the top, the footer at the
 * bottom, and the current page in between. Change the links and the footer
 * freely - this is your app's, not part of the design system.
 *
 * Applied in client/App.tsx. Pages nested inside
 * <Route element={<Layout />}> get this header and footer, drawn where
 * <Outlet /> is. Pages that fill the whole screen on their own (like sign
 * in) are simply not nested inside it.
 *
 * Map screens listed in FULL_BLEED_PATHS skip the header and footer and
 * get the whole screen instead.
 *
 * React Router calls this a "layout route":
 * https://reactrouter.com/start/declarative/routing#layout-routes
 */
export function Layout() {
  const { pathname } = useLocation();

  // Map screens fill the whole screen and bring their own controls (the
  // language and sign-in live in the home screen's menu).
  if (FULL_BLEED_PATHS.includes(pathname)) {
    return (
      <div className={styles.fullBleed}>
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.appName}>
          {t.appName}
        </Link>
        <nav className={styles.nav}>
          <Link to="/">{t.nav.map}</Link>
          <Link to="/collection">{t.nav.collection}</Link>
          <a href={COURSE_GITHUB} target="_blank" rel="noreferrer">
            GitHub
          </a>
          {SHOW_DEMOS ? <Link to="/demos">Demos</Link> : null}
          <LanguageSwitcher />
        </nav>
      </header>

      <div className={styles.content}>
        {/* Shows a spinner while the page downloads, under the header. */}
        <Suspense
          fallback={
            <main>
              <Spinner />
            </main>
          }
        >
          <Outlet />
        </Suspense>
      </div>

      <footer className={styles.footer}>
        <p>{t.partners}</p>
        <p>
          <AuthAction /> | {COURSE_CREDITS}
        </p>
      </footer>
    </div>
  );
}

/**
 * A way out - or a way in, if nobody is signed in.
 *
 * Shows the pseudonymous username, never the email (docs/00-product.markdown).
 * Usernames are English words, so they are always left to right.
 */
function AuthAction() {
  const { user, profile, loading, needsPasskey, signOut } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Link to="/signin">{t.nav.signIn}</Link>;
  if (needsPasskey) return <Link to="/signin">{t.auth.finishSetup}</Link>;

  return (
    <>
      {profile ? (
        <>
          {t.auth.signedInAs} <bdi dir="ltr">{profile.username}</bdi>
          {" · "}
          <Link
            to="/signin"
            state={{ step: "passkey", mode: "add", from: location.pathname }}
          >
            {t.auth.addPasskey}
          </Link>
          {" · "}
        </>
      ) : null}
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => void signOut()}
      >
        {t.nav.signOut}
      </button>
    </>
  );
}

/**
 * One button per language, each written in its own language so anyone can
 * find theirs. Choosing one reloads the app in it.
 */
function LanguageSwitcher() {
  return (
    <div className={styles.languages} role="group" aria-label={t.language}>
      {(Object.keys(LANGUAGES) as Lang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          dir={LANGUAGES[lang].dir}
          className={styles.language}
          aria-pressed={lang === LANG}
          onClick={() => {
            if (lang !== LANG) setLanguage(lang);
          }}
        >
          {LANGUAGES[lang].name}
        </button>
      ))}
    </div>
  );
}

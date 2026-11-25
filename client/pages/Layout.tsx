import { Suspense } from "react";
import { Link, Outlet } from "react-router";
import { Spinner } from "../components";
import { useAuth } from "../lib/auth";
import { COURSE_CREDITS, COURSE_GITHUB, SHOW_DEMOS } from "../lib/config";
import { LANG } from "../lib/config";
import { LANGUAGES, setLanguage, t, type Lang } from "../lib/i18n";
import styles from "./Layout.module.css";

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
 * React Router calls this a "layout route":
 * https://reactrouter.com/start/declarative/routing#layout-routes
 */
export function Layout() {
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
 * A way out - or a way in, if nobody is logged in.
 *
 * Usernames are pseudonymous (docs/00-product.markdown): never show the email
 * here. The username comes with the profiles feature.
 */
function AuthAction() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;
  if (!user) return <Link to="/signin">{t.nav.signIn}</Link>;

  return (
    <>
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

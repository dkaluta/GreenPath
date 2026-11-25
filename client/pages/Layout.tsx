import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { Spinner } from "../components";
import { AppMenu, MapButton } from "../features/map";
import { MenuIcon } from "../features/map/icons";
import { useAuth } from "../lib/auth";
import { COURSE_CREDITS, COURSE_GITHUB, SHOW_DEMOS } from "../lib/config";
import { t } from "../lib/i18n";
import styles from "./Layout.module.css";

/**
 * The GreenPath screens: each fills the whole screen with the map and brings
 * its own frame (the home screen, or <MapScreen> from client/features/map/),
 * so this only gives them the screen and a spinner while one downloads.
 *
 * Applied in client/App.tsx, as a React Router "layout route":
 * https://reactrouter.com/start/declarative/routing#layout-routes
 */
export function MapLayout() {
  return (
    <div className={styles.fullBleed}>
      <Suspense
        fallback={
          <div className={styles.loading}>
            <Spinner />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}

/**
 * The frame around the starter kit's own pages (the demos, the component
 * gallery, events): a floating bar at the top in the map screens' style,
 * the footer at the bottom, and the page in between. The bar's menu is the
 * same app menu as on the map (theme, language, signing in or out).
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
          <AppMenu
            trigger={
              <MapButton label={t.home.menu} className={styles.menu}>
                <MenuIcon />
              </MapButton>
            }
          />
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

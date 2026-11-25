import { Suspense } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { Menu, Spinner } from "../components";
import { CheckIcon, LeafIcon, MenuIcon } from "../features/map/icons";
import { useAuth } from "../lib/auth";
import { cx } from "../lib/cx";
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
 * Screens whose phone layout starts with a map. There the header floats over
 * the map as two pills instead of taking a bar of its own (phones only - see
 * .floating in Layout.module.css).
 */
const MAP_TOP_PATHS = ["/walk", "/route"];

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
      <header
        className={cx(
          styles.header,
          MAP_TOP_PATHS.includes(pathname) && styles.floating,
        )}
      >
        <Link to="/" className={styles.appName}>
          <LeafIcon className={styles.appMark} />
          {t.appName}
        </Link>
        <nav className={styles.nav}>
          <NavLink to="/" end className={styles.navLink}>
            {t.nav.map}
          </NavLink>
          <NavLink to="/collection" className={styles.navLink}>
            {t.nav.collection}
          </NavLink>
          <a
            href={COURSE_GITHUB}
            target="_blank"
            rel="noreferrer"
            className={styles.navLink}
          >
            GitHub
          </a>
          {SHOW_DEMOS ? (
            <NavLink to="/demos" className={styles.navLink}>
              Demos
            </NavLink>
          ) : null}
          <LanguageSwitcher />
        </nav>
        <HeaderMenu />
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
 * On a phone the links and the languages don't fit beside the app name, so
 * they fold into this menu. Only one of it and the nav row shows at a time
 * (Layout.module.css).
 */
function HeaderMenu() {
  const navigate = useNavigate();

  return (
    <Menu
      trigger={
        <button
          type="button"
          className={styles.menuButton}
          aria-label={t.nav.menu}
          title={t.nav.menu}
        >
          <MenuIcon />
        </button>
      }
    >
      <Menu.Item onClick={() => navigate("/")}>{t.nav.map}</Menu.Item>
      <Menu.Item onClick={() => navigate("/collection")}>
        {t.nav.collection}
      </Menu.Item>
      <Menu.Item
        onClick={() => window.open(COURSE_GITHUB, "_blank", "noreferrer")}
      >
        GitHub
      </Menu.Item>
      {SHOW_DEMOS ? (
        <Menu.Item onClick={() => navigate("/demos")}>Demos</Menu.Item>
      ) : null}
      <Menu.Separator />
      {(Object.keys(LANGUAGES) as Lang[]).map((lang) => (
        <Menu.Item
          key={lang}
          lang={lang}
          dir={LANGUAGES[lang].dir}
          onClick={() => {
            if (lang !== LANG) setLanguage(lang);
          }}
        >
          <span className={styles.menuCheck}>
            {lang === LANG ? <CheckIcon size={16} /> : null}
          </span>
          {LANGUAGES[lang].name}
        </Menu.Item>
      ))}
    </Menu>
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

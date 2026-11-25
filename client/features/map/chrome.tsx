import type { ComponentProps, ReactElement, ReactNode, RefObject } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { Menu } from "../../components";
import { useAuth } from "../../lib/auth";
import { LANG } from "../../lib/config";
import { cx } from "../../lib/cx";
import { LANGUAGES, setLanguage, t, type Lang } from "../../lib/i18n";
import {
  setThemeSetting,
  THEME_SETTINGS,
  useThemeSetting,
  type ThemeSetting,
} from "../../lib/theme";
import {
  LeafIcon,
  LocateIcon,
  MapIcon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
} from "./icons";
import type { MapHandle } from "./MapView";
import styles from "./chrome.module.css";

/*
 * The frame every map screen shares, so the home screen and the screens
 * that open over the map (walk setup, route choice, summary, collection...)
 * look like one app: the desktop rail, the app menu, the round floating map
 * buttons and the zoom and location controls. MapScreen.tsx puts them
 * together for the screens that are a panel or sheet over the map.
 */

/** A round floating button over the map. */
export function MapButton({
  label,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(styles.mapButton, className)}
      {...props}
    >
      {children}
    </button>
  );
}

/** A "back" chevron, pointing to the start side: mirrored in RTL. */
export function BackChevron({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={styles.flipInRtl}
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/**
 * My location, then zoom in and out: the bottom end corner on desktop, as
 * in Google Maps. `before` goes above them (the home screen's layers).
 */
export function MapControls({
  mapRef,
  onLocate,
  before,
  className,
}: {
  mapRef: RefObject<MapHandle | null>;
  onLocate: () => void;
  before?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.controls, className)}>
      {before}
      <MapButton label={t.map.myLocation} onClick={onLocate}>
        <LocateIcon />
      </MapButton>
      <div className={styles.zoom}>
        <MapButton
          label={t.map.zoomIn}
          onClick={() => mapRef.current?.zoomIn()}
        >
          <PlusIcon />
        </MapButton>
        <MapButton
          label={t.map.zoomOut}
          onClick={() => mapRef.current?.zoomOut()}
        >
          <MinusIcon />
        </MapButton>
      </div>
    </div>
  );
}

/**
 * The narrow desktop rail on the start side: the app menu, the map and the
 * collection. `children` adds buttons of the screen's own, such as the home
 * screen's recents.
 */
export function Rail({ children }: { children?: ReactNode }) {
  return (
    <nav className={styles.rail} aria-label={t.home.menu}>
      <AppMenu
        trigger={
          <button
            type="button"
            className={styles.railButton}
            aria-label={t.home.menu}
          >
            <MenuIcon />
          </button>
        }
      />
      <NavLink to="/" end className={styles.railButton}>
        <MapIcon />
        <span>{t.nav.map}</span>
      </NavLink>
      <NavLink to="/collection" className={styles.railButton}>
        <LeafIcon />
        <span>{t.nav.collection}</span>
      </NavLink>
      {children}
    </nav>
  );
}

/** A rail button for a screen's own action. */
export function RailButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.railButton} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

/**
 * The menu behind the desktop rail's menu button and the phone's profile
 * button: who is signed in (by pseudonymous username, never the email),
 * the collection, the theme, the language and signing in or out. The map
 * screens have no header, so this is where those live.
 */
export function AppMenu({ trigger }: { trigger: ReactElement }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useThemeSetting();
  const { user, profile, loading, needsPasskey, signOut } = useAuth();

  return (
    <Menu trigger={trigger}>
      {user && profile ? (
        <Menu.Group label={t.auth.signedInAs}>
          <p className={styles.username}>
            <bdi dir="ltr">{profile.username}</bdi>
          </p>
        </Menu.Group>
      ) : null}
      <Menu.Item onClick={() => navigate("/collection")}>
        {t.nav.collection}
      </Menu.Item>
      {user && !loading ? (
        needsPasskey ? (
          <Menu.Item onClick={() => navigate("/signin")}>
            {t.auth.finishSetup}
          </Menu.Item>
        ) : (
          <Menu.Item
            onClick={() =>
              navigate("/signin", {
                state: {
                  step: "passkey",
                  mode: "add",
                  from: location.pathname,
                },
              })
            }
          >
            {t.auth.addPasskey}
          </Menu.Item>
        )
      ) : null}

      <Menu.Separator />
      <Menu.Group label={t.theme.label}>
        <Menu.RadioGroup
          value={theme}
          onValueChange={(value: ThemeSetting) => setThemeSetting(value)}
        >
          {THEME_SETTINGS.map((setting) => (
            <Menu.RadioItem key={setting} value={setting} closeOnClick={false}>
              {t.theme[setting]}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Group>

      <Menu.Separator />
      <Menu.Group label={t.language}>
        <Menu.RadioGroup
          value={LANG}
          onValueChange={(lang: Lang) => {
            if (lang !== LANG) setLanguage(lang);
          }}
        >
          {(Object.keys(LANGUAGES) as Lang[]).map((lang) => (
            <Menu.RadioItem
              key={lang}
              value={lang}
              lang={lang}
              dir={LANGUAGES[lang].dir}
            >
              {LANGUAGES[lang].name}
            </Menu.RadioItem>
          ))}
        </Menu.RadioGroup>
      </Menu.Group>

      {loading ? null : (
        <>
          <Menu.Separator />
          {user ? (
            <Menu.Item onClick={() => void signOut()}>
              {t.nav.signOut}
            </Menu.Item>
          ) : (
            <Menu.Item
              onClick={() =>
                navigate("/signin", { state: { from: location.pathname } })
              }
            >
              {t.nav.signIn}
            </Menu.Item>
          )}
        </>
      )}
    </Menu>
  );
}

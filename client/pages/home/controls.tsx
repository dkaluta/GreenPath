import type { ComponentProps, ReactElement, Ref } from "react";
import { useNavigate } from "react-router";
import { Menu } from "../../components";
import type { MapFilter, MapFilters } from "../../features/map";
import { CheckIcon, SearchIcon } from "../../features/map/icons";
import { useAuth } from "../../lib/auth";
import { LANG } from "../../lib/config";
import { cx } from "../../lib/cx";
import { LANGUAGES, setLanguage, t, type Lang } from "../../lib/i18n";
import styles from "./HomePage.module.css";

/*
 * The floating controls the phone and desktop home layouts share.
 */

export type WalkMode = "destination" | "walk";

export function SearchBox({
  inputRef,
  value,
  onChange,
  onSubmit,
  onFocus,
  className,
}: {
  inputRef?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onFocus?: () => void;
  className?: string;
}) {
  return (
    <form
      role="search"
      className={cx(styles.search, className)}
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        if (query) onSubmit(query);
      }}
    >
      <button type="submit" className={styles.searchButton}>
        <SearchIcon />
        <span className={styles.visuallyHidden}>{t.home.search}</span>
      </button>
      <input
        ref={inputRef}
        type="search"
        dir="auto"
        className={styles.searchInput}
        placeholder={t.home.searchPlaceholder}
        aria-label={t.home.searchLabel}
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
      />
    </form>
  );
}

/** ליעד / הליכה חופשית. */
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: WalkMode;
  onChange: (mode: WalkMode) => void;
}) {
  const options: [WalkMode, string][] = [
    ["destination", t.actions.toDestination],
    ["walk", t.actions.freeWalk],
  ];
  return (
    <div className={styles.modeToggle} role="group" aria-label={t.home.mode}>
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={styles.mode}
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const FILTERS: MapFilter[] = ["shade", "parks", "fountains", "benches"];

export function FilterChips({
  filters,
  onToggle,
  className,
}: {
  filters: MapFilters;
  onToggle: (filter: MapFilter) => void;
  className?: string;
}) {
  return (
    <div
      className={cx(styles.chips, className)}
      role="group"
      aria-label={t.map.filtersLabel}
    >
      {FILTERS.map((filter) => (
        <button
          key={filter}
          type="button"
          className={styles.chip}
          aria-pressed={filters[filter]}
          onClick={() => onToggle(filter)}
        >
          {filters[filter] ? <CheckIcon size={16} /> : null}
          {t.map.filters[filter]}
        </button>
      ))}
    </div>
  );
}

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

/** The shaded-street key: a leaf-green line and its name. */
export function Legend({ className }: { className?: string }) {
  return (
    <p className={cx(styles.legend, className)}>
      <span className={styles.legendLine} aria-hidden="true" />
      {t.map.legendShade}
    </p>
  );
}

/**
 * The menu behind the profile button (phone) and the menu button (desktop):
 * the collection, the language and signing in or out. The map screens have
 * no header, so this is where those live.
 */
export function AppMenu({ trigger }: { trigger: ReactElement }) {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  return (
    <Menu trigger={trigger}>
      <Menu.Item onClick={() => navigate("/collection")}>
        {t.nav.collection}
      </Menu.Item>
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
      {loading ? null : (
        <>
          <Menu.Separator />
          {user ? (
            <Menu.Item onClick={() => void signOut()}>
              {t.nav.signOut}
            </Menu.Item>
          ) : (
            <Menu.Item onClick={() => navigate("/signin")}>
              {t.nav.signIn}
            </Menu.Item>
          )}
        </>
      )}
    </Menu>
  );
}

export function Recents({
  recents,
  onPick,
}: {
  recents: string[];
  onPick: (query: string) => void;
}) {
  return (
    <section className={styles.recents} aria-label={t.home.recents}>
      <h3 className={styles.sectionTitle}>{t.home.recents}</h3>
      {recents.length === 0 ? (
        <p className={styles.muted}>{t.home.recentsEmpty}</p>
      ) : (
        <ul className={styles.recentList}>
          {recents.map((query) => (
            <li key={query}>
              <button
                type="button"
                dir="auto"
                className={styles.recent}
                onClick={() => onPick(query)}
              >
                {query}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

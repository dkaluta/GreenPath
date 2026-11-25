import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Popover, useToast } from "../../components";
import {
  ALL_FILTERS_ON,
  BottomSheet,
  MapView,
  useUserLocation,
  type MapFilter,
  type MapFilters,
  type MapHandle,
} from "../../features/map";
import {
  ClockIcon,
  LayersIcon,
  LeafIcon,
  LocateIcon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
  ProfileIcon,
} from "../../features/map/icons";
import { t } from "../../lib/i18n";
import {
  AppMenu,
  FilterChips,
  Legend,
  MapButton,
  ModeToggle,
  Recents,
  SearchBox,
  type WalkMode,
} from "./controls";
import styles from "./HomePage.module.css";
import { addRecent, readRecents } from "./recents";
import { DESKTOP_QUERY, useMediaQuery } from "./useMediaQuery";

/**
 * Home: the map, full screen. Wireframe 100:36.
 *
 * Phone: floating pills on top (search, profile, ליעד / הליכה חופשית), the
 * shaded-street key at the bottom, and a bottom sheet for anything more.
 * Desktop: laid out like Google Maps, with a rail on the start side, a
 * floating search panel, filter chips along the top and the map controls in
 * the bottom end corner. Both mirror between right-to-left and left-to-right
 * through logical CSS properties alone.
 */
export default function HomePage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const navigate = useNavigate();
  const toast = useToast();
  const mapRef = useRef<MapHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<WalkMode>("destination");
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(readRecents);
  const [filters, setFilters] = useState<MapFilters>(ALL_FILTERS_ON);
  /** Phone only: which bottom sheet is up, if any. */
  const [sheet, setSheet] = useState<"search" | "walk" | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const location = useUserLocation();
  const flyWhenFound = useRef(false);

  useEffect(() => {
    if (location.position && flyWhenFound.current) {
      flyWhenFound.current = false;
      mapRef.current?.flyTo(location.position);
    }
  }, [location.position]);

  useEffect(() => {
    if (!location.error) return;
    flyWhenFound.current = false;
    toast.add({
      title:
        location.error === "denied"
          ? t.map.locationDenied
          : t.map.locationUnavailable,
      type: "error",
    });
  }, [location.error, toast]);

  const locate = () => {
    if (location.position) mapRef.current?.flyTo(location.position);
    else {
      flyWhenFound.current = true;
      location.start();
    }
  };

  const search = (destination: string) => {
    setRecents(addRecent(destination));
    navigate(`/route?to=${encodeURIComponent(destination)}`);
  };

  const changeMode = (next: WalkMode) => {
    setMode(next);
    if (!isDesktop) {
      setSheet(next === "walk" ? "walk" : null);
      setSheetExpanded(false);
    }
    if (next === "destination") searchRef.current?.focus();
  };

  const toggleFilter = (filter: MapFilter) =>
    setFilters((current) => ({ ...current, [filter]: !current[filter] }));

  const searchBox = (
    <SearchBox
      inputRef={searchRef}
      value={query}
      onChange={setQuery}
      onSubmit={search}
      onFocus={() => {
        if (isDesktop) return;
        setMode("destination");
        setSheet("search");
      }}
    />
  );

  const map = (
    <MapView
      ref={mapRef}
      filters={filters}
      userLocation={location.position}
      attribution={isDesktop ? "end" : "start"}
      insets={
        isDesktop
          ? { start: PANEL_INSET, top: 64 }
          : { top: 140, bottom: sheet ? 240 : 0 }
      }
    />
  );

  const walkContent = (
    <>
      <p className={styles.hint}>{t.home.freeWalkHint}</p>
      <Button render={<Link to="/walk" />} nativeButton={false}>
        {t.home.freeWalkStart}
      </Button>
    </>
  );

  const destinationContent = (
    <>
      <p className={styles.hint}>{t.home.destinationHint}</p>
      <Recents recents={recents} onPick={search} />
    </>
  );

  if (isDesktop) {
    return (
      <div className={styles.desktop}>
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
          <Link to="/collection" className={styles.railButton}>
            <LeafIcon />
            <span>{t.nav.collection}</span>
          </Link>
          <button
            type="button"
            className={styles.railButton}
            onClick={() => {
              setMode("destination");
              searchRef.current?.focus();
            }}
          >
            <ClockIcon />
            <span>{t.home.recents}</span>
          </button>
        </nav>

        <div className={styles.stage}>
          {map}

          <aside className={styles.panel} aria-label={t.home.searchLabel}>
            {searchBox}
            <ModeToggle mode={mode} onChange={changeMode} />
            <div className={styles.panelBody}>
              {mode === "walk" ? walkContent : destinationContent}
            </div>
          </aside>

          <FilterChips
            className={styles.desktopChips}
            filters={filters}
            onToggle={toggleFilter}
          />

          <Legend className={styles.desktopLegend} />

          <div className={styles.controls}>
            <Popover
              side="inline-start"
              title={t.map.filtersLabel}
              trigger={
                <MapButton label={t.map.layers}>
                  <LayersIcon />
                </MapButton>
              }
            >
              <FilterChips
                className={styles.chipsColumn}
                filters={filters}
                onToggle={toggleFilter}
              />
            </Popover>
            <MapButton label={t.map.myLocation} onClick={locate}>
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
        </div>
      </div>
    );
  }

  return (
    <div className={styles.phone}>
      {map}

      <div className={styles.phoneTop}>
        <div className={styles.searchRow}>
          {searchBox}
          <AppMenu
            trigger={
              <MapButton label={t.home.profile} className={styles.profile}>
                <ProfileIcon />
              </MapButton>
            }
          />
        </div>
        <ModeToggle mode={mode} onChange={changeMode} />
      </div>

      {sheet ? null : (
        <div className={styles.phoneBottom}>
          <MapButton label={t.map.myLocation} onClick={locate}>
            <LocateIcon />
          </MapButton>
          <Legend />
        </div>
      )}

      {sheet ? (
        <BottomSheet
          title={sheet === "walk" ? t.actions.freeWalk : t.home.searchLabel}
          expanded={sheetExpanded}
          onExpandedChange={setSheetExpanded}
          onClose={() => {
            setSheet(null);
            setSheetExpanded(false);
            if (sheet === "walk") setMode("destination");
          }}
        >
          {sheet === "walk" ? walkContent : destinationContent}
        </BottomSheet>
      ) : null}
    </div>
  );
}

/** Rail plus panel plus gaps, in pixels: what the panel covers of the map. */
const PANEL_INSET = 400;

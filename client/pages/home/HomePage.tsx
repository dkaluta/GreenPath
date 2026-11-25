import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, Popover } from "../../components";
import {
  ALL_FILTERS_ON,
  AppMenu,
  BottomSheet,
  MapButton,
  MapControls,
  MapView,
  Rail,
  RailButton,
  useLocate,
  type MapFilter,
  type MapFilters,
  type MapHandle,
} from "../../features/map";
import {
  ClockIcon,
  LayersIcon,
  LocateIcon,
  ProfileIcon,
} from "../../features/map/icons";
import { t } from "../../lib/i18n";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/useMediaQuery";
import {
  FilterChips,
  Legend,
  ModeToggle,
  Recents,
  SearchBox,
  type WalkMode,
} from "./controls";
import styles from "./HomePage.module.css";
import { addRecent, readRecents } from "./recents";

/**
 * Home: the map, full screen. Wireframe 100:36.
 *
 * Phone: floating pills on top (search, profile, ליעד / הליכה חופשית), the
 * shaded-street key at the bottom, and a bottom sheet for anything more.
 * Desktop: laid out like Google Maps, with a rail on the start side, a
 * floating search panel, filter chips along the top and the map controls in
 * the bottom end corner. Both mirror between right-to-left and left-to-right
 * through logical CSS properties alone. The other screens open in the same
 * frame through <MapScreen> (client/features/map/MapScreen.tsx).
 */
export default function HomePage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const navigate = useNavigate();
  const mapRef = useRef<MapHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<WalkMode>("destination");
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState(readRecents);
  const [filters, setFilters] = useState<MapFilters>(ALL_FILTERS_ON);
  /** Phone only: which bottom sheet is up, if any. */
  const [sheet, setSheet] = useState<"search" | "walk" | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const { position, locate } = useLocate(mapRef);

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
      userLocation={position}
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
        <Rail>
          <RailButton
            icon={<ClockIcon />}
            label={t.home.recents}
            onClick={() => {
              setMode("destination");
              searchRef.current?.focus();
            }}
          />
        </Rail>

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

          <MapControls
            mapRef={mapRef}
            onLocate={locate}
            before={
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
            }
          />
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

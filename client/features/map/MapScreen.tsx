import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { t } from "../../lib/i18n";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/useMediaQuery";
import { BottomSheet } from "./BottomSheet";
import { AppMenu, BackChevron, MapButton, MapControls, Rail } from "./chrome";
import { useBack, useLocate } from "./hooks";
import { ProfileIcon } from "./icons";
import { MapView, type MapHandle } from "./MapView";
import type { LngLat, MapLine, MapMarker } from "./overlays";
import styles from "./MapScreen.module.css";

export type MapScreenProps = {
  /** The screen's name: the panel's or sheet's heading (an h1). */
  title: ReactNode;
  /**
   * The back button. A path is where it goes when there is no history to
   * go back to (the default, "/"); `false` hides it.
   */
  back?: string | false;
  /**
   * How it looks on a phone. "sheet" (the default): a bottom sheet over the
   * full-screen map, like walk setup and route choice in the wireframes.
   * "page": a full-screen page with the back and menu buttons on top, like
   * the summary, match and collection wireframes.
   */
  phone?: "sheet" | "page";
  /** Phone sheets only: start at full height instead of half. */
  expanded?: boolean;
  /** Drawn on the map: see client/features/map/index.ts. */
  lines?: readonly MapLine[];
  markers?: readonly MapMarker[];
  /** The map moves to show all of these whenever they change. */
  fit?: readonly LngLat[];
  /** Says which line was tapped, by its id. */
  onLineClick?: (id: string) => void;
  children: ReactNode;
};

/**
 * A screen that opens over the map, in the same frame as the home screen.
 *
 * Desktop (as Google Maps shows directions and place details): the rail on
 * the start side, the map behind, and the screen in a floating panel next to
 * the rail, with the location and zoom buttons in the bottom end corner.
 * Phone (as Apple Maps): the map fills the screen, round back and menu
 * buttons float on top, and the screen is a bottom sheet, or a full page
 * for the screens the wireframes draw that way.
 *
 *     <MapScreen title={t.screens.walk.title} back="/">
 *       ...the screen's content...
 *     </MapScreen>
 *
 * Everything mirrors between right-to-left and left-to-right through
 * logical CSS properties alone.
 */
export function MapScreen({
  title,
  back = "/",
  phone = "sheet",
  expanded: startExpanded = false,
  lines,
  markers,
  fit,
  onLineClick,
  children,
}: MapScreenProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const mapRef = useRef<MapHandle>(null);
  const titleId = useId();
  const goBack = useBack(back || "/");
  const { position, locate } = useLocate(mapRef);
  const [expanded, setExpanded] = useState(startExpanded);

  // Show the whole of `fit` whenever its points change (by value).
  const fitKey = fit?.map((point) => point.join(",")).join(";") ?? "";
  const latestFit = useRef(fit);
  useLayoutEffect(() => {
    latestFit.current = fit;
  });
  useEffect(() => {
    const points = latestFit.current;
    if (points && points.length > 0) mapRef.current?.fitTo([...points]);
  }, [fitKey, isDesktop]);

  const backButton =
    back === false ? null : (
      <MapButton label={t.nav.back} className={styles.back} onClick={goBack}>
        <BackChevron />
      </MapButton>
    );

  const menuButton = (
    <AppMenu
      trigger={
        <MapButton label={t.home.profile} className={styles.profile}>
          <ProfileIcon />
        </MapButton>
      }
    />
  );

  if (!isDesktop && phone === "page") {
    return (
      <main className={styles.page} aria-labelledby={titleId}>
        <header className={styles.pageHeader}>
          {backButton}
          <h1 id={titleId} className={styles.pageTitle}>
            {title}
          </h1>
          {menuButton}
        </header>
        <div className={styles.pageBody}>{children}</div>
      </main>
    );
  }

  const map = (
    <MapView
      ref={mapRef}
      lines={lines}
      markers={markers}
      onLineClick={onLineClick}
      userLocation={position}
      attribution={isDesktop ? "end" : "start"}
      insets={
        isDesktop
          ? { start: PANEL_INSET, top: 16, bottom: 16 }
          : {
              top: 80,
              bottom: Math.round(window.innerHeight * (expanded ? 0.6 : 0.45)),
            }
      }
    />
  );

  if (isDesktop) {
    return (
      <div className={styles.desktop}>
        <Rail />
        <div className={styles.stage}>
          {map}
          <main className={styles.panel} aria-labelledby={titleId}>
            <header className={styles.panelHeader}>
              {back === false ? null : (
                <button
                  type="button"
                  className={styles.panelBack}
                  aria-label={t.nav.back}
                  title={t.nav.back}
                  onClick={goBack}
                >
                  <BackChevron />
                </button>
              )}
              <h1 id={titleId} className={styles.panelTitle}>
                {title}
              </h1>
            </header>
            <div className={styles.panelBody}>{children}</div>
          </main>
          <MapControls mapRef={mapRef} onLocate={locate} />
        </div>
      </div>
    );
  }

  return (
    <main className={styles.phone}>
      {map}
      <div className={styles.phoneTop}>
        {backButton ?? <span />}
        {menuButton}
      </div>
      <BottomSheet
        title={title}
        heading="h1"
        expanded={expanded}
        onExpandedChange={setExpanded}
      >
        <div className={styles.stack}>{children}</div>
      </BottomSheet>
    </main>
  );
}

/** Rail plus panel plus gaps, in pixels: what the panel covers of the map. */
const PANEL_INSET = 420;

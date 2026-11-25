import type { Route } from "@shared/schemas/route";
import { useMemo } from "react";
import { Link, useLocation } from "react-router";
import { MapScreen, type LngLat } from "../../features/map";
import {
  formatDistance,
  formatDuration,
  formatShade,
} from "../../features/routes/format";
import { routeLines } from "../../features/routes/lines";
import actions from "../../features/verifications/actions.module.css";
import { t } from "../../lib/i18n";
import styles from "./NavigatePage.module.css";

/**
 * Wireframe 100:141, navigation. Turn-by-turn is not built yet: this shows
 * the chosen route on the map (route choice passes it as
 * `navigate("/navigate", { state: { route } })`), its time and shade in
 * the bottom sheet, and the ways on to the rest of the flow.
 */
export default function NavigatePage() {
  const location = useLocation();
  const route = (location.state as { route?: Route } | null)?.route ?? null;

  const lines = useMemo(
    () => (route ? routeLines([route], route) : []),
    [route],
  );
  const fit = useMemo<LngLat[]>(
    () => route?.geometry.coordinates ?? [],
    [route],
  );

  return (
    <MapScreen
      title={t.screens.navigate.title}
      back="/route"
      lines={lines}
      fit={fit}
    >
      {route ? (
        <p className={styles.numbers}>
          <span className={styles.time}>
            {formatDuration(route.duration_s)}
          </span>
          <span className={styles.detail}>
            {formatDistance(route.distance_m)} · {formatShade(route.shade)}
          </span>
        </p>
      ) : (
        <p className={styles.detail}>{t.screens.navigate.purpose}</p>
      )}
      <nav className={styles.actions} aria-label={t.stub.next}>
        <Link to="/navigate/stop" className={actions.secondary}>
          {t.actions.stopHere}
        </Link>
        <Link to="/navigate/report" className={actions.secondary}>
          {t.actions.report}
        </Link>
        <Link to="/summary" className={actions.secondary}>
          {t.actions.finish}
        </Link>
      </nav>
    </MapScreen>
  );
}

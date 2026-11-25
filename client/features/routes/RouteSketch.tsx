import type { Route } from "@shared/schemas/route";
import { t } from "../../lib/i18n";
import styles from "./RouteSketch.module.css";

type RouteSketchProps = {
  routes: Route[];
  selectedId?: string;
};

/**
 * TODO(map-shell): replace with the shared map component once it lands.
 *
 * A stand-in for the map: the route lines drawn as plain SVG, north up, with
 * the selected route thick and coloured by shade (green where shaded, brown
 * in the sun) and the others dotted, as in wireframe 100:112. No tiles and
 * no streets. It is a real map projection, so it is not mirrored in RTL.
 */
export function RouteSketch({ routes, selectedId }: RouteSketchProps) {
  const all = routes.flatMap((r) => r.geometry.coordinates);
  if (all.length === 0) return <div className={styles.sketch} />;

  const lngs = all.map((c) => c[0]);
  const lats = all.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  // Equal metres on both axes: squash longitude by cos(latitude).
  const w = Math.max((maxLng - minLng) * Math.cos(midLat), 1e-6);
  const h = Math.max(maxLat - minLat, 1e-6);
  const size = 1000;
  const scale = size / Math.max(w, h);
  const pad = 40;
  const viewW = w * scale + pad * 2;
  const viewH = h * scale + pad * 2;
  const x = (lng: number) => pad + (lng - minLng) * Math.cos(midLat) * scale;
  const y = (lat: number) => pad + (maxLat - lat) * scale;
  const points = (route: Route) =>
    route.geometry.coordinates
      .map(([lng, lat]) => `${x(lng)},${y(lat)}`)
      .join(" ");

  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];
  const start = selected.geometry.coordinates[0];
  const end = selected.geometry.coordinates.at(-1)!;

  return (
    <svg
      className={styles.sketch}
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label={t.route.map}
    >
      {routes
        .filter((r) => r !== selected)
        .map((route) => (
          <polyline
            key={route.id}
            className={styles.other}
            points={points(route)}
          />
        ))}
      <polyline className={styles.casing} points={points(selected)} />
      {selected.geometry.coordinates.slice(1).map(([lng, lat], i) => {
        const [lng0, lat0] = selected.geometry.coordinates[i];
        return (
          <line
            key={i}
            x1={x(lng0)}
            y1={y(lat0)}
            x2={x(lng)}
            y2={y(lat)}
            className={
              selected.segment_shade[i] >= 0.5 ? styles.shaded : styles.sunny
            }
          />
        );
      })}
      <circle
        className={styles.start}
        cx={x(start[0])}
        cy={y(start[1])}
        r={14}
      />
      <rect
        className={styles.end}
        x={x(end[0]) - 12}
        y={y(end[1]) - 12}
        width={24}
        height={24}
        rx={4}
      />
    </svg>
  );
}

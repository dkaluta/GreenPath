import {
  latLngSchema,
  walkTargetSchema,
  type LatLng,
  type Route,
  type RouteRequest,
  type WalkTarget,
} from "@shared/schemas/route";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, Spinner } from "../../components";
import {
  formatDistance,
  formatDuration,
  formatShade,
  formatTrees,
} from "../../features/routes/format";
import { useOrigin, useRoutes } from "../../features/routes/hooks";
import { RouteMap } from "../../features/routes/RouteMap";
import styles from "../../features/routes/screen.module.css";
import { ApiRequestError } from "../../lib/api";
import { t } from "../../lib/i18n";

/** Borochov junction to Givatayim park, for trying the screen out. */
const EXAMPLE = "/route?from=32.0647,34.8074&to=32.0776,34.8142";

/**
 * Screen 3, choose a route (wireframe 100:112): two to four routes with
 * their time and share of shade, shadiest first.
 *
 *   /route?to=lat,lng[&from=lat,lng]   to a destination
 *   /route?walk=minutes:30[&from=...]  a free walk (units: minutes, meters, steps)
 *
 * Without `from`, the walk starts where the person is, or in the middle of
 * Givatayim when they are elsewhere.
 */
export default function RouteChoicePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = useMemo(() => parsePoint(params.get("from")), [params]);
  const to = useMemo(() => parsePoint(params.get("to")), [params]);
  const walk = useMemo(() => parseWalk(params.get("walk")), [params]);
  const wanted = Boolean(to || walk);

  const origin = useOrigin(from, wanted);
  const request = useMemo<RouteRequest | null>(() => {
    if (!origin) return null;
    if (walk) return { kind: "free", from: origin.point, target: walk };
    if (to) return { kind: "destination", from: origin.point, to };
    return null;
  }, [origin, walk, to]);

  const query = useRoutes(request);
  const routes = query.data?.routes ?? [];
  const [chosenId, setChosenId] = useState<string | null>(null);
  const selected = routes.find((r) => r.id === chosenId) ?? routes[0];

  return (
    <main className={styles.screen}>
      <div className={styles.map}>
        <RouteMap
          routes={routes}
          selectedId={selected?.id}
          origin={origin?.point}
          destination={to}
          onSelect={setChosenId}
        />
      </div>

      <section className={styles.sheet} aria-labelledby="route-title">
        <h1 id="route-title" className={styles.title}>
          {walk ? t.route.freeTitle : t.route.destinationTitle}
        </h1>

        {!wanted ? (
          <>
            <p className={styles.subtitle}>{t.route.noDestination}</p>
            <Link to={EXAMPLE}>{t.route.example}</Link>
          </>
        ) : !origin ? (
          <p className={styles.loading}>
            <Spinner /> {t.route.locating}
          </p>
        ) : query.isPending ? (
          <p className={styles.loading}>
            <Spinner /> {t.route.loading}
          </p>
        ) : query.isError ? (
          isOutside(query.error) ? (
            <p className={styles.error} role="alert">
              {t.route.outsideArea}
            </p>
          ) : (
            <>
              <p className={styles.error} role="alert">
                {t.route.error}
              </p>
              <Button variant="secondary" onClick={() => void query.refetch()}>
                {t.route.retry}
              </Button>
            </>
          )
        ) : (
          <>
            {origin.fallback ? (
              <p className={styles.note}>{t.route.pilotStart}</p>
            ) : null}
            <fieldset className={styles.options}>
              <legend className={styles.visuallyHidden}>
                {t.route.options}
              </legend>
              {routes.map((route, i) => (
                <RouteOption
                  key={route.id}
                  route={route}
                  index={i}
                  checked={route === selected}
                  onChoose={() => setChosenId(route.id)}
                />
              ))}
            </fieldset>
            <Button
              size="lg"
              className={styles.primary}
              onClick={() =>
                navigate("/navigate", { state: { route: selected } })
              }
            >
              {t.route.go}
            </Button>
            <p className={styles.credits}>{t.route.credits}</p>
          </>
        )}
      </section>
    </main>
  );
}

function RouteOption({
  route,
  index,
  checked,
  onChoose,
}: {
  route: Route;
  index: number;
  checked: boolean;
  onChoose: () => void;
}) {
  // Loops are all "loops"; the first one is the shadiest of them.
  const kind = route.kind === "loop" && index === 0 ? "shadiest" : route.kind;
  return (
    <label className={styles.option}>
      <input
        type="radio"
        name="route"
        value={route.id}
        checked={checked}
        onChange={onChoose}
      />
      <span className={styles.optionName}>
        <span className={styles.kind}>{t.route.kinds[kind]}</span>
        <span className={styles.detail}>
          {formatDistance(route.distance_m)} · {formatTrees(route.trees)}
        </span>
      </span>
      <span className={styles.optionNumbers}>
        <span className={styles.time}>{formatDuration(route.duration_s)}</span>
        <span className={styles.shade}>{formatShade(route.shade)}</span>
      </span>
    </label>
  );
}

function isOutside(error: Error) {
  return (
    error instanceof ApiRequestError && error.code === "outside_pilot_area"
  );
}

/** "32.07,34.81" -> { lat, lng }, or null. */
function parsePoint(value: string | null): LatLng | null {
  if (!value) return null;
  const [lat, lng] = value.split(",").map(Number);
  const result = latLngSchema.safeParse({ lat, lng });
  return result.success ? result.data : null;
}

/** "minutes:30" -> { unit, value }, or null. */
function parseWalk(value: string | null): WalkTarget | null {
  if (!value) return null;
  const [unit, amount] = value.split(":");
  const result = walkTargetSchema.safeParse({ unit, value: Number(amount) });
  return result.success ? result.data : null;
}

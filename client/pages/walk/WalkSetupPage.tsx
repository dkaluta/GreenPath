import {
  isInPilotArea,
  WALK_LIMITS,
  type WalkUnit,
} from "@shared/schemas/route";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components";
import { DEFAULT_CENTER, MapView, useUserLocation } from "../../features/map";
import { formatWalkValue } from "../../features/routes/format";
import styles from "../../features/routes/screen.module.css";
import { t } from "../../lib/i18n";

const UNITS: WalkUnit[] = ["minutes", "meters", "steps"];

/**
 * Screen 2, free walk setup (wireframe 100:74): choose how long to walk, in
 * time, distance or steps, then find shaded loops on /route.
 */
export default function WalkSetupPage() {
  const navigate = useNavigate();
  const location = useUserLocation();
  // The walk starts here only inside the pilot city; elsewhere it starts in
  // the middle of Givatayim (see useOrigin), so show that instead.
  const here =
    location.position &&
    isInPilotArea({ lng: location.position[0], lat: location.position[1] })
      ? location.position
      : null;
  const [unit, setUnit] = useState<WalkUnit>("minutes");
  const [values, setValues] = useState<Record<WalkUnit, number>>({
    minutes: WALK_LIMITS.minutes.initial,
    meters: WALK_LIMITS.meters.initial,
    steps: WALK_LIMITS.steps.initial,
  });

  const limits = WALK_LIMITS[unit];
  const value = values[unit];
  const shown = formatWalkValue(unit, value);
  const change = (delta: number) =>
    setValues((current) => ({
      ...current,
      [unit]: Math.min(limits.max, Math.max(limits.min, current[unit] + delta)),
    }));

  return (
    <main className={styles.screen}>
      <div className={styles.map}>
        <MapView center={here ?? DEFAULT_CENTER} userLocation={here} />
      </div>

      <section className={styles.sheet} aria-labelledby="walk-title">
        <h1 id="walk-title" className={styles.title}>
          {t.screens.walk.title}
        </h1>

        <fieldset className={styles.segmented}>
          <legend className={styles.visuallyHidden}>{t.walk.unitGroup}</legend>
          {UNITS.map((u) => (
            <label key={u} className={styles.segment}>
              <input
                type="radio"
                name="unit"
                value={u}
                checked={unit === u}
                onChange={() => setUnit(u)}
              />
              {t.walk.units[u]}
            </label>
          ))}
        </fieldset>

        <div className={styles.counter}>
          <button
            type="button"
            className={styles.step}
            aria-label={t.walk.decrease}
            disabled={value <= limits.min}
            onClick={() => change(-limits.step)}
          >
            −
          </button>
          <output className={styles.value} aria-live="polite">
            <span className={styles.number}>{shown.number}</span>
            <span className={styles.unit}>{shown.unit}</span>
          </output>
          <button
            type="button"
            className={styles.step}
            aria-label={t.walk.increase}
            disabled={value >= limits.max}
            onClick={() => change(limits.step)}
          >
            +
          </button>
        </div>

        <Button
          size="lg"
          className={styles.primary}
          onClick={() => navigate(`/route?walk=${unit}:${value}`)}
        >
          {t.walk.findRoute}
        </Button>
      </section>
    </main>
  );
}

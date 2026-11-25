import { WALK_LIMITS, type WalkUnit } from "@shared/schemas/route";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components";
import { MapScreen } from "../../features/map";
import { formatWalkValue } from "../../features/routes/format";
import styles from "../../features/routes/screen.module.css";
import { t } from "../../lib/i18n";

const UNITS: WalkUnit[] = ["minutes", "meters", "steps"];

/**
 * Screen 2, free walk setup (wireframe 100:74): choose how long to walk, in
 * time, distance or steps, then find shaded loops on /route. A bottom
 * sheet over the map on phones, the floating panel on desktop.
 */
export default function WalkSetupPage() {
  const navigate = useNavigate();
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
    <MapScreen title={t.screens.walk.title} back="/" expanded>
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
    </MapScreen>
  );
}

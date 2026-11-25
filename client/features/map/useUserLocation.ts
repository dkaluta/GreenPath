import { useCallback, useEffect, useRef, useState } from "react";
import type { LngLat } from "./overlays";

export type UserLocation = {
  /** Where the person is, or null until the browser says. */
  position: LngLat | null;
  /** Accuracy in metres, when known. */
  accuracy: number | null;
  /** "denied" when the person said no, "unavailable" for anything else. */
  error: "denied" | "unavailable" | null;
  /** Asks the browser for the location and keeps following it. */
  start(): void;
};

/**
 * The person's location, for the dot on the map.
 *
 * Nothing is asked until start() is called, so the browser's permission
 * prompt appears when someone presses "my location", not on page load.
 * If they allowed it before, `auto` starts it straight away.
 */
export function useUserLocation({ auto = true } = {}): UserLocation {
  const [position, setPosition] = useState<LngLat | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<UserLocation["error"]>(null);
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("unavailable");
      return;
    }
    if (watchId.current !== null) return;
    setError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.longitude, pos.coords.latitude]);
        setAccuracy(pos.coords.accuracy);
        setError(null);
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        if (watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
  }, []);

  useEffect(() => {
    if (!auto || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (!cancelled && status.state === "granted") start();
      })
      .catch(() => {
        // Some browsers cannot query this permission. Wait for the button.
      });
    return () => {
      cancelled = true;
    };
  }, [auto, start]);

  useEffect(
    () => () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    },
    [],
  );

  return { position, accuracy, error, start };
}

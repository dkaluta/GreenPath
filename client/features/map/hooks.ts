import { useEffect, useRef, type RefObject } from "react";
import { useLocation, useNavigate } from "react-router";
import { useToast } from "../../components";
import { t } from "../../lib/i18n";
import type { MapHandle } from "./MapView";
import { useUserLocation } from "./useUserLocation";

/* The hooks the map screens' frame (chrome.tsx, MapScreen.tsx) shares. */

/**
 * Back where the person came from, or `fallback` when they opened this
 * screen directly (there is nothing in this tab's history to go back to).
 */
export function useBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key === "default") navigate(fallback);
    else navigate(-1);
  };
}

/**
 * The person's location for a map: the dot's position, and `locate()` for
 * the "my location" button, which asks the first time and then flies there.
 * A refusal shows as a toast.
 */
export function useLocate(mapRef: RefObject<MapHandle | null>) {
  const toast = useToast();
  const location = useUserLocation();
  const flyWhenFound = useRef(false);

  useEffect(() => {
    if (location.position && flyWhenFound.current) {
      flyWhenFound.current = false;
      mapRef.current?.flyTo(location.position);
    }
  }, [location.position, mapRef]);

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

  return { position: location.position, locate };
}

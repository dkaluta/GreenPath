import type { CreateReportInput, Point, Report } from "@shared/schemas/report";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

/** Sends a report from the walk. */
export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) =>
      api<Report>("/api/reports", { method: "POST", body: input }),
    onSuccess: () => {
      // A report with a street counts towards "streets helped".
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
    },
  });
}

/** Where the phone is now, or null if it can't or won't say. */
export function currentPosition(timeoutMs = 10_000): Promise<Point | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}

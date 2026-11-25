import type { CreateWalkInput, Walk } from "@shared/schemas/walk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const walkKeys = { all: ["walks"] as const };

/** The logged-in person's latest walks, newest first. */
export function useWalks(enabled = true) {
  return useQuery({
    queryKey: walkKeys.all,
    queryFn: () => api<Walk[]>("/api/walks"),
    enabled,
  });
}

/** Records a finished walk. */
export function useFinishWalk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWalkInput) =>
      api<Walk>("/api/walks", { method: "POST", body: input }),
    onSuccess: (walk) => {
      // Put it at the top of the list straight away, then refetch.
      queryClient.setQueryData<Walk[]>(walkKeys.all, (walks) => [
        walk,
        ...(walks ?? []).filter((w) => w.id !== walk.id),
      ]);
      void queryClient.invalidateQueries({ queryKey: walkKeys.all });
    },
  });
}

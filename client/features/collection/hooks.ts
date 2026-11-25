import type { Collection } from "@shared/schemas/verification";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

export const collectionKeys = { all: ["collection"] as const };

/** The species the logged-in person has collected, and the streets helped. */
export function useCollection() {
  return useQuery({
    queryKey: collectionKeys.all,
    queryFn: () => api<Collection>("/api/collection"),
  });
}

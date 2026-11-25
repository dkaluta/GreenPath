import type {
  CreateVerificationInput,
  Verification,
} from "@shared/schemas/verification";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";

export type UploadedPhoto = { path: string; url: string | null };

/** Uploads one photo through POST /api/uploads, the same flow events use. */
export function useUploadPhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api<UploadedPhoto>("/api/uploads", { method: "POST", formData });
    },
  });
}

/** Records the answer to "is it the same tree?". */
export function useCreateVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVerificationInput) =>
      api<Verification>("/api/verifications", { method: "POST", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collection"] });
    },
  });
}

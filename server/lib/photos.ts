import type { Context } from "hono";
import type { AppEnv } from "../env";

/**
 * True if every given photo path is in the caller's own upload folder.
 *
 * POST /api/uploads stores files under "<user id>/...". Without this check,
 * someone could attach another person's photo to their verification just by
 * knowing its path, and get a signed link to it back.
 */
export function ownsPhotos(
  c: Context<AppEnv>,
  ...paths: (string | null | undefined)[]
) {
  const prefix = `${c.get("user").id}/`;
  return paths.every((path) => path == null || path.startsWith(prefix));
}

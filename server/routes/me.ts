import { Hono, type Context } from "hono";
import type { AppEnv } from "../env";
import {
  getOrCreateProfile,
  rerollUsername,
  supabaseProfileStore,
  type ProfileStore,
} from "../lib/profiles";
import { createAdminClient } from "../lib/supabase";

/**
 * Who am I? Returns `{ id, username }` and nothing else: never the email
 * (docs/00-product.markdown, "Usernames are pseudonymous").
 *
 * Requires a login. The user comes from the auth middleware, which already
 * checked the token - so by the time we get here, `c.get("user")` is
 * trustworthy.
 *
 * `getStore` is there so tests can swap in a fake database.
 */
export function createMeRoutes(
  getStore: (c: Context<AppEnv>) => ProfileStore = (c) =>
    supabaseProfileStore(createAdminClient(c.env)),
) {
  return (
    new Hono<AppEnv>()
      // The first call creates the profile, with a generated username.
      .get("/", async (c) => {
        const profile = await getOrCreateProfile(getStore(c), c.get("user").id);
        return c.json(profile);
      })

      // A new generated username. People never type their own.
      .post("/username/reroll", async (c) => {
        const profile = await rerollUsername(getStore(c), c.get("user").id);
        return c.json(profile);
      })
  );
}

export const me = createMeRoutes();

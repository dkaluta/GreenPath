import type { SupabaseClient } from "@supabase/supabase-js";
import { generateUsername, type Profile } from "@shared/schemas/profile";

/*
 * Profiles: the pseudonymous username for each person. The table is in
 * supabase/migrations/*_profiles.sql. Nothing else about the person is
 * stored there, and nothing here ever reads or returns an email.
 */

/** What saving a username can come back with. */
export type SaveResult = "saved" | "taken";

/**
 * The few database calls profiles need. Written as an interface so the logic
 * below can be tested without a database; `supabaseProfileStore` is the real
 * one.
 */
export type ProfileStore = {
  find(id: string): Promise<Profile | null>;
  /** "taken" when another person already has this username. */
  insert(id: string, username: string): Promise<SaveResult>;
  /** "taken" when another person already has this username. */
  updateUsername(id: string, username: string): Promise<SaveResult>;
};

/**
 * How many usernames to try before giving up. With about 46,000
 * combinations a clash is rare, so ten in a row means something else is
 * wrong.
 */
export const MAX_ATTEMPTS = 10;

export class UsernameExhaustedError extends Error {
  constructor() {
    super(`No free username after ${MAX_ATTEMPTS} attempts`);
    this.name = "UsernameExhaustedError";
  }
}

/**
 * Returns the person's profile, creating it with a generated username the
 * first time. Picks again when the username is taken.
 */
export async function getOrCreateProfile(
  store: ProfileStore,
  id: string,
  generate: () => string = generateUsername,
): Promise<Profile> {
  const existing = await store.find(id);
  if (existing) return existing;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const username = generate();
    if ((await store.insert(id, username)) === "saved") {
      return { id, username };
    }
    // "taken" can also mean a second request for the same person created
    // the row a moment ago (two tabs opening at once). If so, use that.
    const raced = await store.find(id);
    if (raced) return raced;
  }
  throw new UsernameExhaustedError();
}

/**
 * Gives the person a new generated username, different from their current
 * one. People cannot type their own (docs/00-product.markdown).
 */
export async function rerollUsername(
  store: ProfileStore,
  id: string,
  generate: () => string = generateUsername,
): Promise<Profile> {
  const current = await getOrCreateProfile(store, id, generate);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const username = generate();
    if (username === current.username) continue;
    if ((await store.updateUsername(id, username)) === "saved") {
      return { id, username };
    }
  }
  throw new UsernameExhaustedError();
}

/** Postgres's code for "this would break a unique index". */
const UNIQUE_VIOLATION = "23505";

/** The real store, on Supabase. Pass it the admin client. */
export function supabaseProfileStore(db: SupabaseClient): ProfileStore {
  return {
    async find(id) {
      const { data, error } = await db
        .from("profiles")
        .select("id, username")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async insert(id, username) {
      const { error } = await db.from("profiles").insert({ id, username });
      if (!error) return "saved";
      if (error.code === UNIQUE_VIOLATION) return "taken";
      throw error;
    },

    async updateUsername(id, username) {
      const { error } = await db
        .from("profiles")
        .update({ username })
        .eq("id", id);
      if (!error) return "saved";
      if (error.code === UNIQUE_VIOLATION) return "taken";
      throw error;
    },
  };
}

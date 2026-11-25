import type { Collection } from "@shared/schemas/verification";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail } from "../lib/errors";
import { IMAGE_BUCKET, IMAGE_URL_TTL_SECONDS } from "../lib/storage";
import { createAdminClient } from "../lib/supabase";

/*
 * The personal tree collection (screen 9): every species the person has
 * confirmed with "same", and how many streets they helped with.
 *
 * Only the caller's own rows are read. Nothing about the person beyond
 * these counts is returned.
 */

type VerificationRow = {
  species: string | null;
  street: string | null;
  answer: string;
  tree_photo_path: string | null;
  created_at: string;
};

/** Plenty for one person; keeps a runaway account from costing a lot. */
const ROW_LIMIT = 5000;

/** Pure, so it can be tested without a database. */
export function buildCollection(
  verifications: VerificationRow[],
  reportStreets: (string | null)[],
): Omit<Collection, "species"> & {
  species: (Omit<Collection["species"][number], "photo_url"> & {
    photo_path: string | null;
  })[];
} {
  const bySpecies = new Map<
    string,
    {
      count: number;
      first: string;
      latest: string;
      photo_path: string | null;
    }
  >();

  for (const row of verifications) {
    if (row.answer !== "same" || !row.species) continue;
    const entry = bySpecies.get(row.species);
    if (!entry) {
      bySpecies.set(row.species, {
        count: 1,
        first: row.created_at,
        latest: row.created_at,
        photo_path: row.tree_photo_path,
      });
      continue;
    }
    entry.count += 1;
    if (row.created_at < entry.first) entry.first = row.created_at;
    if (row.created_at > entry.latest && row.tree_photo_path) {
      entry.latest = row.created_at;
      entry.photo_path = row.tree_photo_path;
    }
  }

  const streets = new Set(
    [...verifications.map((row) => row.street), ...reportStreets]
      .filter((street): street is string => Boolean(street))
      .map((street) => street.trim().toLocaleLowerCase()),
  );

  return {
    species: [...bySpecies.entries()]
      .map(([species, entry]) => ({
        species,
        count: entry.count,
        first_collected_at: entry.first,
        photo_path: entry.photo_path,
      }))
      .sort((a, b) => b.first_collected_at.localeCompare(a.first_collected_at)),
    streets_helped: streets.size,
    trees_verified: verifications.filter((row) => row.answer !== "no_tree")
      .length,
  };
}

export const collection = new Hono<AppEnv>()

  // GET /api/collection
  .get("/", async (c) => {
    const supabase = createAdminClient(c.env);
    const userId = c.get("user").id;

    const [verifications, reports] = await Promise.all([
      supabase
        .from("tree_verifications")
        .select("species, street, answer, tree_photo_path, created_at")
        .eq("user_id", userId)
        .limit(ROW_LIMIT)
        .returns<VerificationRow[]>(),
      supabase
        .from("tree_reports")
        .select("street")
        .eq("user_id", userId)
        .not("street", "is", null)
        .limit(ROW_LIMIT)
        .returns<{ street: string | null }[]>(),
    ]);

    if (verifications.error || reports.error) {
      console.error(
        "load collection failed:",
        verifications.error ?? reports.error,
      );
      return fail(c, 500, "database_error", "Could not load your collection.");
    }

    const built = buildCollection(
      verifications.data,
      reports.data.map((row) => row.street),
    );

    // Signed links for the photos, all in one request.
    const paths = built.species
      .map((entry) => entry.photo_path)
      .filter((path) => path !== null);
    const signed = paths.length
      ? await supabase.storage
          .from(IMAGE_BUCKET)
          .createSignedUrls(paths, IMAGE_URL_TTL_SECONDS)
      : null;

    const result: Collection = {
      ...built,
      species: built.species.map(({ photo_path, ...entry }) => ({
        ...entry,
        photo_url:
          signed?.data?.find((item) => item.path === photo_path)?.signedUrl ??
          null,
      })),
    };
    return c.json(result);
  });

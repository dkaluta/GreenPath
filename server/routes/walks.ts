import type { Walk } from "@shared/schemas/walk";
import { createWalkSchema } from "@shared/schemas/walk";
import { Hono } from "hono";
import type { AppEnv } from "../env";
import { fail, validate } from "../lib/errors";
import { createAdminClient } from "../lib/supabase";

/*
 * Finished walks, for the summary screen.
 *
 * The browser sends distance, steps and shade. How many trees were checked
 * is NOT taken from it: the server counts the person's verifications
 * between the walk's start and end.
 */

const COLUMNS =
  "id, distance_m, steps, shade_share, started_at, ended_at, trees_verified";

type WalkRow = Omit<Walk, "trees">;

/**
 * The walk's times come from the phone's clock and the verifications' from
 * the database's. Allow this much difference between them, so a tree
 * checked in the first minute of a walk is not lost to a clock that is a
 * little off.
 */
const CLOCK_SLACK_MS = 2 * 60 * 1000;

function widen(walk: { started_at: string; ended_at: string }) {
  return {
    from: new Date(Date.parse(walk.started_at) - CLOCK_SLACK_MS).toISOString(),
    to: new Date(Date.parse(walk.ended_at) + CLOCK_SLACK_MS).toISOString(),
  };
}
type TreeRow = Walk["trees"][number] & { created_at: string };

/** The trees someone checked between two times. "No tree here" is left out. */
async function treesBetween(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  from: string,
  to: string,
) {
  return supabase
    .from("tree_verifications")
    .select("tree_id, species, answer, created_at")
    .eq("user_id", userId)
    .neq("answer", "no_tree")
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: true })
    .returns<TreeRow[]>();
}

function treesOf(walk: WalkRow, trees: TreeRow[]): Walk["trees"] {
  const range = widen(walk);
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  return trees
    .filter((tree) => {
      const at = Date.parse(tree.created_at);
      return at >= from && at <= to;
    })
    .map(({ tree_id, species, answer }) => ({ tree_id, species, answer }));
}

export const walks = new Hono<AppEnv>()

  // GET /api/walks - the person's latest walks, newest first.
  .get("/", async (c) => {
    const supabase = createAdminClient(c.env);
    const userId = c.get("user").id;

    const { data, error } = await supabase
      .from("walks")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("ended_at", { ascending: false })
      .limit(10)
      .returns<WalkRow[]>();

    if (error) {
      console.error("list walks failed:", error);
      return fail(c, 500, "database_error", "Could not load your walks.");
    }
    if (data.length === 0) return c.json([]);

    // One query for the trees of all of them, split up below.
    const from = widen(data.at(-1)!).from;
    const to = widen(data[0]!).to;
    const trees = await treesBetween(supabase, userId, from, to);
    if (trees.error) {
      console.error("list walk trees failed:", trees.error);
      return fail(c, 500, "database_error", "Could not load your walks.");
    }

    return c.json(
      data.map((walk) => ({ ...walk, trees: treesOf(walk, trees.data) })),
    );
  })

  // POST /api/walks - record a finished walk. Responds 201.
  .post("/", validate("json", createWalkSchema), async (c) => {
    const input = c.req.valid("json");
    const supabase = createAdminClient(c.env);
    const userId = c.get("user").id;

    const { from, to } = widen(input);
    const trees = await treesBetween(supabase, userId, from, to);
    if (trees.error) {
      console.error("count walk trees failed:", trees.error);
      return fail(c, 500, "database_error", "Could not save the walk.");
    }

    const { data, error } = await supabase
      .from("walks")
      .insert({
        ...input,
        user_id: userId,
        trees_verified: trees.data.length,
      })
      .select(COLUMNS)
      .single<WalkRow>();

    if (error) {
      console.error("create walk failed:", error);
      return fail(c, 500, "database_error", "Could not save the walk.");
    }
    return c.json({ ...data, trees: treesOf(data, trees.data) }, 201);
  });

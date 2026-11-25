import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../env";
import { buildCollection, collection } from "./collection";
import { reports } from "./reports";
import { verifications } from "./verifications";
import { walks } from "./walks";

/*
 * The report, verification, walk and collection routes, without a real
 * database. `createAdminClient` is replaced with a stand-in that records
 * every query and answers with whatever a test sets in `results`.
 *
 * What these tests guard: the user id always comes from the login, never
 * from the body; nobody can attach someone else's photos; and bad input
 * never reaches the database.
 */

type Call = {
  table: string;
  op: "select" | "insert";
  payload?: Record<string, unknown>;
  filters: unknown[][];
};

const calls: Call[] = [];
/** Keyed "table.op", e.g. "walks.insert". */
let results: Record<string, { data: unknown; error: unknown }> = {};

function query(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  calls.push(call);
  const builder: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          const result = results[`${call.table}.${call.op}`] ?? {
            data: [],
            error: null,
          };
          return (resolve: (v: unknown) => void) => resolve(result);
        }
        return (...args: unknown[]) => {
          if (prop === "insert") {
            call.op = "insert";
            call.payload = args[0] as Record<string, unknown>;
          } else if (!["select", "single", "returns"].includes(String(prop))) {
            call.filters.push([prop, ...args]);
          }
          return builder;
        };
      },
    },
  );
  return builder;
}

vi.mock("../lib/supabase", () => ({
  createAdminClient: () => ({
    from: query,
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((path) => ({
            path,
            signedUrl: `https://signed.test/${path}`,
          })),
        }),
      }),
    },
  }),
}));

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const PHOTO = `${USER}/33333333-3333-4333-8333-333333333333.jpg`;
const LEAVES = `${USER}/44444444-4444-4444-8444-444444444444.jpg`;

const app = new Hono<AppEnv>()
  .use(async (c, next) => {
    c.set("user", { id: USER });
    await next();
  })
  .route("/api/reports", reports)
  .route("/api/verifications", verifications)
  .route("/api/walks", walks)
  .route("/api/collection", collection);

const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "" };

function post(path: string, body: unknown) {
  return app.request(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
}

beforeEach(() => {
  calls.length = 0;
  results = {};
});

describe("POST /api/reports", () => {
  it("saves a damaged report as the logged-in user", async () => {
    results["tree_reports.insert"] = {
      data: { id: "r1", kind: "damaged", send_to_municipality: true },
      error: null,
    };
    const response = await post("/api/reports", {
      kind: "damaged",
      tree_id: "yaad-42",
      user_id: OTHER, // ignored
    });
    expect(response.status).toBe(201);
    expect(calls[0]?.payload).toMatchObject({
      kind: "damaged",
      tree_id: "yaad-42",
      user_id: USER,
    });
  });

  it("stores a location as lat and lng", async () => {
    await post("/api/reports", {
      kind: "missing_from_map",
      location: { lat: 32.07, lng: 34.81 },
    });
    expect(calls[0]?.payload).toMatchObject({ lat: 32.07, lng: 34.81 });
  });

  it("rejects an unknown kind without touching the database", async () => {
    const response = await post("/api/reports", {
      kind: "ugly",
      tree_id: "yaad-1",
    });
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("answers 500 when the database fails", async () => {
    results["tree_reports.insert"] = { data: null, error: { message: "x" } };
    const response = await post("/api/reports", {
      kind: "gone",
      tree_id: "yaad-1",
    });
    expect(response.status).toBe(500);
  });
});

describe("POST /api/verifications", () => {
  const valid = {
    tree_id: "yaad-42",
    species: "Ficus microcarpa",
    street: "Katznelson",
    answer: "same",
    tree_photo_path: PHOTO,
    leaves_photo_path: LEAVES,
  };

  it("saves the answer and photos as the logged-in user", async () => {
    results["tree_verifications.insert"] = { data: { id: "v1" }, error: null };
    const response = await post("/api/verifications", valid);
    expect(response.status).toBe(201);
    expect(calls[0]?.payload).toMatchObject({
      user_id: USER,
      answer: "same",
      tree_photo_path: PHOTO,
      leaves_photo_path: LEAVES,
    });
  });

  it("refuses photos from someone else's folder", async () => {
    const response = await post("/api/verifications", {
      ...valid,
      tree_photo_path: `${OTHER}/33333333-3333-4333-8333-333333333333.jpg`,
    });
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });

  it("needs a photo unless there is no tree", async () => {
    const response = await post("/api/verifications", {
      ...valid,
      tree_photo_path: undefined,
    });
    expect(response.status).toBe(400);
  });

  it("drops photos sent with 'no tree here'", async () => {
    await post("/api/verifications", { ...valid, answer: "no_tree" });
    expect(calls[0]?.payload).toMatchObject({
      answer: "no_tree",
      tree_photo_path: null,
      leaves_photo_path: null,
    });
  });
});

describe("POST /api/walks", () => {
  const walk = {
    distance_m: 1200,
    steps: 1640,
    shade_share: 0.78,
    started_at: "2026-11-25T10:00:00.000Z",
    ended_at: "2026-11-25T10:30:00.000Z",
  };

  it("counts the trees from the database, not the request", async () => {
    results["tree_verifications.select"] = {
      data: [
        {
          tree_id: "a",
          species: "Olea europaea",
          answer: "same",
          created_at: "2026-11-25T10:05:00.000Z",
        },
        {
          tree_id: "b",
          species: "Ficus microcarpa",
          answer: "not_sure",
          created_at: "2026-11-25T10:10:00.000Z",
        },
      ],
      error: null,
    };
    results["walks.insert"] = {
      data: { ...walk, id: "w1", trees_verified: 2 },
      error: null,
    };

    const response = await post("/api/walks", {
      ...walk,
      trees_verified: 99,
    });
    expect(response.status).toBe(201);

    const insert = calls.find((call) => call.op === "insert");
    expect(insert?.payload).toMatchObject({ user_id: USER, trees_verified: 2 });
    expect(calls[0]?.filters).toContainEqual(["eq", "user_id", USER]);

    const body = (await response.json()) as { trees: unknown[] };
    expect(body.trees).toHaveLength(2);
  });

  it("rejects a walk that ends before it starts", async () => {
    const response = await post("/api/walks", {
      ...walk,
      ended_at: "2026-11-25T09:00:00.000Z",
    });
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("GET /api/walks", () => {
  it("lists only the logged-in user's walks", async () => {
    results["walks.select"] = { data: [], error: null };
    const response = await app.request("/api/walks", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(calls[0]?.filters).toContainEqual(["eq", "user_id", USER]);
  });
});

describe("GET /api/collection", () => {
  it("returns species with signed photo links", async () => {
    results["tree_verifications.select"] = {
      data: [
        {
          species: "Olea europaea",
          street: "Katznelson",
          answer: "same",
          tree_photo_path: PHOTO,
          created_at: "2026-11-25T10:05:00.000Z",
        },
      ],
      error: null,
    };
    results["tree_reports.select"] = {
      data: [{ street: "Weizmann" }],
      error: null,
    };

    const response = await app.request("/api/collection", {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      species: [
        {
          species: "Olea europaea",
          count: 1,
          first_collected_at: "2026-11-25T10:05:00.000Z",
          photo_url: `https://signed.test/${PHOTO}`,
        },
      ],
      streets_helped: 2,
      trees_verified: 1,
    });
    for (const call of calls) {
      expect(call.filters).toContainEqual(["eq", "user_id", USER]);
    }
  });
});

describe("buildCollection", () => {
  const row = (over: Partial<Parameters<typeof buildCollection>[0][0]>) => ({
    species: "Olea europaea",
    street: "Katznelson",
    answer: "same",
    tree_photo_path: null,
    created_at: "2026-11-01T00:00:00.000Z",
    ...over,
  });

  it("collects only species confirmed with 'same'", () => {
    const built = buildCollection(
      [
        row({}),
        row({ species: "Ficus microcarpa", answer: "different" }),
        row({ species: "Ceratonia siliqua", answer: "not_sure" }),
      ],
      [],
    );
    expect(built.species.map((s) => s.species)).toEqual(["Olea europaea"]);
    expect(built.trees_verified).toBe(3);
  });

  it("counts a street once, whatever its case", () => {
    const built = buildCollection(
      [row({}), row({ street: "katznelson " })],
      ["Katznelson", null],
    );
    expect(built.streets_helped).toBe(1);
  });

  it("does not count 'no tree here' as a tree verified", () => {
    const built = buildCollection([row({ answer: "no_tree" })], []);
    expect(built.trees_verified).toBe(0);
    expect(built.streets_helped).toBe(1);
  });

  it("keeps the first date and the latest photo", () => {
    const built = buildCollection(
      [
        row({ created_at: "2026-11-02T00:00:00.000Z", tree_photo_path: "b" }),
        row({ created_at: "2026-11-01T00:00:00.000Z", tree_photo_path: "a" }),
      ],
      [],
    );
    expect(built.species[0]).toMatchObject({
      count: 2,
      first_collected_at: "2026-11-01T00:00:00.000Z",
      photo_path: "b",
    });
  });
});

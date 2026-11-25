import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { describe, expect, it } from "vitest";
import { usernameSchema, type Profile } from "@shared/schemas/profile";
import type { AppEnv } from "../env";
import {
  getOrCreateProfile,
  MAX_ATTEMPTS,
  rerollUsername,
  UsernameExhaustedError,
  type ProfileStore,
} from "../lib/profiles";
import { createMeRoutes } from "./me";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

/** A profiles table in memory, with the same unique-username rule. */
function memoryStore(initial: Profile[] = []) {
  const rows = new Map(initial.map((p) => [p.id, p.username]));
  const taken = (username: string, except?: string) =>
    [...rows].some(([id, name]) => name === username && id !== except);

  const store: ProfileStore & { rows: typeof rows } = {
    rows,
    async find(id) {
      const username = rows.get(id);
      return username ? { id, username } : null;
    },
    async insert(id, username) {
      if (rows.has(id) || taken(username)) return "taken";
      rows.set(id, username);
      return "saved";
    },
    async updateUsername(id, username) {
      if (taken(username, id)) return "taken";
      rows.set(id, username);
      return "saved";
    },
  };
  return store;
}

/** Returns the given names in order, then repeats the last one. */
function sequence(...names: string[]) {
  let i = 0;
  return () => names[Math.min(i++, names.length - 1)];
}

describe("getOrCreateProfile", () => {
  it("returns the existing profile without making a new one", async () => {
    const store = memoryStore([{ id: ALICE, username: "calm shady olive" }]);
    const profile = await getOrCreateProfile(store, ALICE, () => {
      throw new Error("should not generate");
    });
    expect(profile).toEqual({ id: ALICE, username: "calm shady olive" });
  });

  it("creates a profile with a generated, valid username", async () => {
    const store = memoryStore();
    const profile = await getOrCreateProfile(store, ALICE);
    expect(profile.id).toBe(ALICE);
    expect(usernameSchema.safeParse(profile.username).success).toBe(true);
    expect(store.rows.get(ALICE)).toBe(profile.username);
  });

  it("picks again when the username is taken", async () => {
    const store = memoryStore([{ id: BOB, username: "calm shady olive" }]);
    const profile = await getOrCreateProfile(
      store,
      ALICE,
      sequence("calm shady olive", "kind leafy fig"),
    );
    expect(profile.username).toBe("kind leafy fig");
  });

  it("uses the row a parallel request just created", async () => {
    const store = memoryStore();
    // Another request wins the race between our find() and insert().
    const realInsert = store.insert;
    store.insert = async (id, username) => {
      store.rows.set(id, "brave misty owl");
      return realInsert(id, username);
    };
    const profile = await getOrCreateProfile(store, ALICE);
    expect(profile.username).toBe("brave misty owl");
  });

  it("gives up after too many clashes", async () => {
    const store = memoryStore([{ id: BOB, username: "calm shady olive" }]);
    await expect(
      getOrCreateProfile(store, ALICE, () => "calm shady olive"),
    ).rejects.toBeInstanceOf(UsernameExhaustedError);
  });
});

describe("rerollUsername", () => {
  it("changes to a different username", async () => {
    const store = memoryStore([{ id: ALICE, username: "calm shady olive" }]);
    const profile = await rerollUsername(
      store,
      ALICE,
      sequence("calm shady olive", "kind leafy fig"),
    );
    expect(profile.username).toBe("kind leafy fig");
    expect(store.rows.get(ALICE)).toBe("kind leafy fig");
  });

  it("skips usernames that someone else has", async () => {
    const store = memoryStore([
      { id: ALICE, username: "calm shady olive" },
      { id: BOB, username: "kind leafy fig" },
    ]);
    const profile = await rerollUsername(
      store,
      ALICE,
      sequence("kind leafy fig", "merry dewy owl"),
    );
    expect(profile.username).toBe("merry dewy owl");
    expect(store.rows.get(BOB)).toBe("kind leafy fig");
  });

  it("gives up after MAX_ATTEMPTS without changing anything", async () => {
    const store = memoryStore([{ id: ALICE, username: "calm shady olive" }]);
    let calls = 0;
    await expect(
      rerollUsername(store, ALICE, () => {
        calls++;
        return "calm shady olive";
      }),
    ).rejects.toBeInstanceOf(UsernameExhaustedError);
    expect(calls).toBe(MAX_ATTEMPTS);
    expect(store.rows.get(ALICE)).toBe("calm shady olive");
  });
});

describe("/api/me routes", () => {
  function makeApp(store: ProfileStore, userId = ALICE) {
    // Stands in for requireAuth, which has its own tests.
    const fakeAuth = createMiddleware<AppEnv>(async (c, next) => {
      c.set("user", { id: userId });
      await next();
    });
    return new Hono<AppEnv>().use("*", fakeAuth).route(
      "/api/me",
      createMeRoutes(() => store),
    );
  }

  it("GET returns only id and username, creating the profile", async () => {
    const store = memoryStore();
    const response = await makeApp(store).request("/api/me");
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["id", "username"]);
    expect(body.id).toBe(ALICE);
    expect(store.rows.get(ALICE)).toBe(body.username);
  });

  it("GET returns the same username every time", async () => {
    const app = makeApp(memoryStore());
    const first = await (await app.request("/api/me")).json();
    const second = await (await app.request("/api/me")).json();
    expect(second).toEqual(first);
  });

  it("POST /username/reroll returns a new username", async () => {
    const store = memoryStore([{ id: ALICE, username: "calm shady olive" }]);
    const response = await makeApp(store).request("/api/me/username/reroll", {
      method: "POST",
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Profile;
    expect(Object.keys(body).sort()).toEqual(["id", "username"]);
    expect(body.username).not.toBe("calm shady olive");
    expect(usernameSchema.safeParse(body.username).success).toBe(true);
    expect(store.rows.get(ALICE)).toBe(body.username);
  });

  it("reroll only touches the signed-in person's profile", async () => {
    const store = memoryStore([
      { id: ALICE, username: "calm shady olive" },
      { id: BOB, username: "kind leafy fig" },
    ]);
    await makeApp(store, BOB).request("/api/me/username/reroll", {
      method: "POST",
    });
    expect(store.rows.get(ALICE)).toBe("calm shady olive");
    expect(store.rows.get(BOB)).not.toBe("kind leafy fig");
  });

  it("GET with reroll is not allowed", async () => {
    const response = await makeApp(memoryStore()).request(
      "/api/me/username/reroll",
    );
    expect(response.status).toBe(404);
  });
});

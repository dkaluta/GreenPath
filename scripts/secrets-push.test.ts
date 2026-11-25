import { describe, expect, it } from "vitest";
import { buildVariables, parseEnv, serverSecrets } from "./secrets-push";

const ENV = `# a comment
VITE_SUPABASE_URL=https://abc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_x"
VITE_SHOW_DEMOS=true
SUPABASE_URL=\${VITE_SUPABASE_URL}
SUPABASE_SECRET_KEY=sb_secret_x # inline comment
EMPTY=
`;

describe("secrets:push", () => {
  const env = parseEnv(ENV);

  it("reads .env lines, without comments or quotes", () => {
    expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_x");
    expect(env.SUPABASE_SECRET_KEY).toBe("sb_secret_x");
  });

  it("sends only server lines as secrets, never VITE_ ones or SUPABASE_URL", () => {
    expect(serverSecrets(env)).toEqual({ SUPABASE_SECRET_KEY: "sb_secret_x" });
  });

  it("sends only VITE_ lines as build variables", () => {
    expect(Object.keys(buildVariables(env))).toEqual([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "VITE_SHOW_DEMOS",
    ]);
    expect(buildVariables(env).VITE_SHOW_DEMOS).toEqual({
      value: "true",
      is_secret: false,
    });
  });
});

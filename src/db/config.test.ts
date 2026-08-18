import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { resolveDatabaseConfig, isRemoteLibsqlUrl } from "./config";
import { VERCEL_DB_REQUIRED_ERROR } from "@/lib/runtime";

describe("isRemoteLibsqlUrl", () => {
  it("accepts libsql and http(s) URLs", () => {
    assert.equal(isRemoteLibsqlUrl("libsql://db.turso.io"), true);
    assert.equal(isRemoteLibsqlUrl("https://db.turso.io"), true);
    assert.equal(isRemoteLibsqlUrl("http://127.0.0.1:8080"), true);
    assert.equal(isRemoteLibsqlUrl("file:data/app.db"), false);
  });
});

describe("resolveDatabaseConfig", () => {
  it("prefers a remote Turso URL", () => {
    const cfg = resolveDatabaseConfig({
      env: {
        TURSO_DATABASE_URL: "libsql://example.turso.io",
        TURSO_AUTH_TOKEN: "tok",
      },
    });
    assert.equal(cfg.remote, true);
    assert.equal(cfg.url, "libsql://example.turso.io");
    assert.equal(cfg.authToken, "tok");
  });

  it("uses a local file when Turso is unset", () => {
    const cfg = resolveDatabaseConfig({
      dbFilePath: "/tmp/macro-test.db",
      env: {},
    });
    assert.equal(cfg.remote, false);
    assert.ok(cfg.url.startsWith("file:"));
    assert.match(cfg.url, /macro-test\.db$/);
  });

  it("requires Turso on Vercel when no file override is set", () => {
    assert.throws(
      () =>
        resolveDatabaseConfig({
          env: { VERCEL: "1" },
        }),
      (err: unknown) =>
        err instanceof Error && err.message === VERCEL_DB_REQUIRED_ERROR,
    );
  });
});

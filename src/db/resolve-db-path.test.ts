import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveDbPath } from "@/db";

describe("resolveDbPath", () => {
  const priorDbPath = process.env.CALORIE_LOGGER_DB_PATH;
  const priorVercel = process.env.VERCEL;

  afterEach(() => {
    if (priorDbPath === undefined) {
      delete process.env.CALORIE_LOGGER_DB_PATH;
    } else {
      process.env.CALORIE_LOGGER_DB_PATH = priorDbPath;
    }
    if (priorVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = priorVercel;
    }
  });

  it("uses an explicit path before env and Vercel", () => {
    process.env.CALORIE_LOGGER_DB_PATH = "/tmp/from-env.db";
    process.env.VERCEL = "1";
    expect(resolveDbPath("/tmp/explicit.db")).toBe("/tmp/explicit.db");
  });

  it("uses CALORIE_LOGGER_DB_PATH before the Vercel default", () => {
    process.env.CALORIE_LOGGER_DB_PATH = "/tmp/from-env.db";
    process.env.VERCEL = "1";
    expect(resolveDbPath()).toBe("/tmp/from-env.db");
  });

  it("uses the process tmpdir on Vercel when no path is set", () => {
    delete process.env.CALORIE_LOGGER_DB_PATH;
    process.env.VERCEL = "1";
    expect(resolveDbPath()).toBe(path.join(os.tmpdir(), "calorie-logger.db"));
  });

  it("uses data/app.db for local runs", () => {
    delete process.env.CALORIE_LOGGER_DB_PATH;
    delete process.env.VERCEL;
    expect(resolveDbPath()).toBe(path.join(process.cwd(), "data", "app.db"));
  });
});

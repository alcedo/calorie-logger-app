import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, resetDbForTests } from "@/db";
import { clearTenantHandles } from "@/lib/tenant";
import { foods, goals } from "@/db/schema";
import { SEED_FOODS } from "@/db/seed-data";

describe("createDb / seed idempotency", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "calorie-logger-seed-"));
  const dbPath = path.join(dir, "seed.db");

  afterAll(() => {
    clearTenantHandles();
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.unlinkSync(dbPath + suffix);
      } catch {
        // ignore
      }
    }
    try {
      fs.rmdirSync(dir);
    } catch {
      // ignore
    }
  });

  it("seeds foods and default goals on first create", () => {
    resetDbForTests(dbPath);
    const count = db.select().from(foods).all().length;
    expect(count).toBe(SEED_FOODS.length);
    const g = db.select().from(goals).where(eq(goals.id, 1)).get();
    expect(g).toMatchObject({
      calories: 2000,
      protein: 120,
      carbs: 225,
      fat: 65,
    });
  });

  it("does not duplicate foods when reopening the same file", () => {
    const before = db.select().from(foods).all().length;
    // Re-open same path (simulates second process / re-import)
    resetDbForTests(dbPath);
    const after = db.select().from(foods).all().length;
    expect(after).toBe(before);
    expect(after).toBe(SEED_FOODS.length);
  });
});

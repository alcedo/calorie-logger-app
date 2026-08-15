import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeEach } from "vitest";
import {
  clearEntriesForTests,
  resetDbForTests,
} from "@/db";

/** Create an isolated temp SQLite DB for the current test file. */
export function setupTempDatabase(): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "calorie-logger-"));
  const dbPath = path.join(dir, "test.db");

  resetDbForTests(dbPath);

  beforeEach(() => {
    clearEntriesForTests();
    // Remove any user/ai foods added during prior tests; keep seeds
    const sqlite = globalThis.__calorieLoggerSqlite;
    if (sqlite) {
      sqlite.prepare("DELETE FROM foods WHERE source != 'seed'").run();
    }
  });

  afterAll(() => {
    const sqlite = globalThis.__calorieLoggerSqlite;
    if (sqlite) {
      try {
        sqlite.close();
      } catch {
        // ignore
      }
    }
    globalThis.__calorieLoggerSqlite = undefined;
    globalThis.__calorieLoggerDb = undefined;
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
}

export function jsonRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

export async function readJson<T = unknown>(
  res: Response
): Promise<{ status: number; body: T }> {
  return { status: res.status, body: (await res.json()) as T };
}

export function makeFood(overrides: Partial<{
  id: number;
  name: string;
  normalizedName: string;
  aliases: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  source: "seed" | "ai" | "user";
  createdAt: string;
}> = {}) {
  return {
    id: 1,
    name: "Chicken Breast",
    normalizedName: "chicken breast",
    aliases: "[]",
    servingSize: 100,
    servingUnit: "g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    sugar: 0,
    sodium: 74,
    source: "seed" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

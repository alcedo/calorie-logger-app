import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { clearEntriesForTests, resetDbForTests } from "@/db";
import { mintTestSession } from "@/lib/auth/session";
import { TEST_AMBIENT_EMAIL, TEST_AMBIENT_NAME } from "@/lib/auth/test-user";
import { clearTenantHandles } from "@/lib/tenant";

let ambientCookie = "";

export function setAmbientTestCookie(cookie: string): void {
  ambientCookie = cookie;
}

export function ambientAuthCookie(): string {
  return ambientCookie;
}

/** Create an isolated temp SQLite DB for the current test file. */
export function setupTempDatabase(): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "calorie-logger-"));
  const dbPath = path.join(dir, "test.db");
  process.env.MACRO_DATA_DIR = dir;

  resetDbForTests(dbPath);

  beforeAll(async () => {
    setAmbientTestCookie(
      await mintTestSession({
        email: TEST_AMBIENT_EMAIL,
        name: TEST_AMBIENT_NAME,
      }),
    );
  });

  beforeEach(() => {
    clearEntriesForTests();
    const sqlite = globalThis.__calorieLoggerSqlite;
    if (sqlite) {
      sqlite.prepare("DELETE FROM foods WHERE source != 'seed'").run();
    }
  });

  afterAll(() => {
    clearTenantHandles();
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.unlinkSync(dbPath + suffix);
      } catch {
        /* ignore */
      }
    }
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });
}

export function jsonRequest(
  method: string,
  url: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): NextRequest {
  const headers: Record<string, string> = {};
  const rest = { ...(extraHeaders ?? {}) };
  const cookieSpecified = Object.prototype.hasOwnProperty.call(
    rest,
    "cookie",
  );
  if (cookieSpecified) {
    const cookie = rest.cookie;
    delete rest.cookie;
    if (cookie) headers.cookie = cookie;
  } else if (ambientCookie) {
    headers.cookie = ambientCookie;
  }
  Object.assign(headers, rest);
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function readJson<T = unknown>(
  res: Response,
): Promise<{ status: number; body: T }> {
  return { status: res.status, body: (await res.json()) as T };
}

export function makeFood(
  overrides: Partial<{
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
  }> = {},
) {
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

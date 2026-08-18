import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { eq, ne, sql } from "drizzle-orm";
import * as schema from "./schema";
import { entries, foods, goals, settings } from "./schema";
import { SEED_FOODS } from "./seed-data";
import { normalizeFoodName } from "../lib/normalize";
import { resolveDatabaseConfig } from "./config";

const DDL = `
CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  aliases TEXT NOT NULL DEFAULT '[]',
  serving_size REAL NOT NULL,
  serving_unit TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  fiber REAL NOT NULL DEFAULT 0,
  sugar REAL NOT NULL DEFAULT 0,
  sodium REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  calories REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  fiber REAL NOT NULL DEFAULT 0,
  sugar REAL NOT NULL DEFAULT 0,
  sodium REAL NOT NULL DEFAULT 0,
  raw_input TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY,
  calories REAL NOT NULL DEFAULT 2000,
  protein REAL NOT NULL DEFAULT 120,
  carbs REAL NOT NULL DEFAULT 225,
  fat REAL NOT NULL DEFAULT 65
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export type DrizzleDb = LibSQLDatabase<typeof schema>;

declare global {
  var __calorieLoggerDb: DrizzleDb | undefined;
  var __calorieLoggerClient: Client | undefined;
  var __calorieLoggerReady: Promise<void> | undefined;
}

function createHandle(dbFilePath?: string): { client: Client; db: DrizzleDb } {
  const config = resolveDatabaseConfig({ dbFilePath });
  if (config.filePath) {
    fs.mkdirSync(path.dirname(config.filePath), { recursive: true });
  }
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
    intMode: "number",
  });
  const db = drizzle(client, { schema });
  return { client, db };
}

function getHandle(dbFilePath?: string): { client: Client; db: DrizzleDb } {
  if (!globalThis.__calorieLoggerDb || !globalThis.__calorieLoggerClient) {
    const handle = createHandle(dbFilePath);
    globalThis.__calorieLoggerClient = handle.client;
    globalThis.__calorieLoggerDb = handle.db;
  }
  return {
    client: globalThis.__calorieLoggerClient,
    db: globalThis.__calorieLoggerDb,
  };
}

async function migrateAndSeed(client: Client, db: DrizzleDb): Promise<void> {
  const config = resolveDatabaseConfig();
  if (!config.remote) {
    await client.execute("PRAGMA foreign_keys = ON");
    await client.execute("PRAGMA journal_mode = WAL");
  }
  await client.executeMultiple(DDL);

  await db
    .insert(goals)
    .values({ id: 1, calories: 2000, protein: 120, carbs: 225, fat: 65 })
    .onConflictDoNothing();

  const countRow = await db.select({ n: sql<number>`count(*)` }).from(foods);
  const n = Number(countRow[0]?.n ?? 0);
  if (n === 0) {
    await db
      .insert(foods)
      .values(
        SEED_FOODS.map((f) => ({
          name: f.name,
          normalizedName: normalizeFoodName(f.name),
          aliases: JSON.stringify(
            (f.aliases ?? []).map((a) => normalizeFoodName(a)),
          ),
          servingSize: f.servingSize,
          servingUnit: f.servingUnit,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          fiber: f.fiber ?? 0,
          sugar: f.sugar ?? 0,
          sodium: f.sodium ?? 0,
          source: "seed" as const,
        })),
      )
      .onConflictDoNothing();
  }
}

/**
 * Open (or reuse) the libSQL client and apply schema + seed.
 * Safe to call on every request; migrate/seed runs once per process.
 */
export async function ensureDb(): Promise<DrizzleDb> {
  const { client, db } = getHandle();
  if (!globalThis.__calorieLoggerReady) {
    globalThis.__calorieLoggerReady = migrateAndSeed(client, db);
  }
  await globalThis.__calorieLoggerReady;
  return db;
}

/**
 * Live proxy so tests can swap the underlying SQLite file via
 * `resetDbForTests` without rewriting every `import { db }` binding.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = getHandle().db as unknown as object;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

/** Close any open connection and open a fresh DB at `dbFilePath` (tests only). */
export async function resetDbForTests(dbFilePath: string): Promise<DrizzleDb> {
  if (globalThis.__calorieLoggerClient) {
    try {
      globalThis.__calorieLoggerClient.close();
    } catch {
      // already closed
    }
  }
  globalThis.__calorieLoggerClient = undefined;
  globalThis.__calorieLoggerDb = undefined;
  globalThis.__calorieLoggerReady = undefined;
  process.env.CALORIE_LOGGER_DB_PATH = dbFilePath;
  const { client, db: instance } = getHandle(dbFilePath);
  globalThis.__calorieLoggerReady = migrateAndSeed(client, instance);
  await globalThis.__calorieLoggerReady;
  return instance;
}

/** Drop entries and reset goals; keep seeded foods (tests only). */
export async function clearEntriesForTests(): Promise<void> {
  const instance = await ensureDb();
  await instance.delete(entries);
  await instance.delete(settings);
  await instance
    .update(goals)
    .set({ calories: 2000, protein: 120, carbs: 225, fat: 65 })
    .where(eq(goals.id, 1));
  await instance.delete(foods).where(ne(foods.source, "seed"));
}

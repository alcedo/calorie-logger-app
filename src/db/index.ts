import os from "node:os";
import path from "node:path";
import { TEST_AMBIENT_EMAIL, TEST_AMBIENT_NAME } from "@/lib/auth/test-user";
import { userIdFromEmail } from "@/lib/auth/session";
import {
  clearTenantHandles,
  currentTenant,
  currentTenantOrNull,
  pinAmbientTenant,
  tenantFor,
} from "@/lib/tenant";
import { openDatabaseFile, type DrizzleDb } from "./open";

export type { DrizzleDb } from "./open";
export { openDatabaseFile } from "./open";

declare global {
  var __calorieLoggerDb: DrizzleDb | undefined;
  var __calorieLoggerSqlite: import("better-sqlite3").Database | undefined;
}

export function resolveDbPath(dbFilePath?: string): string {
  if (dbFilePath) return dbFilePath;
  if (process.env.CALORIE_LOGGER_DB_PATH) {
    return process.env.CALORIE_LOGGER_DB_PATH;
  }
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "calorie-logger.db");
  }
  return path.join(process.cwd(), "data", "app.db");
}

function getDb(): DrizzleDb {
  return currentTenant().db;
}

/**
 * Live proxy so tests can swap the underlying SQLite file via
 * `resetDbForTests` without rewriting every `import { db }` binding.
 */
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = getDb() as unknown as object;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

/** Close any open connection and open a fresh DB at `dbFilePath` (tests only). */
export function resetDbForTests(dbFilePath: string): DrizzleDb {
  clearTenantHandles();
  process.env.CALORIE_LOGGER_DB_PATH = dbFilePath;
  const user = {
    id: userIdFromEmail(TEST_AMBIENT_EMAIL),
    email: TEST_AMBIENT_EMAIL,
    name: TEST_AMBIENT_NAME,
  };
  const tenant = tenantFor(user, dbFilePath);
  pinAmbientTenant(tenant);
  globalThis.__calorieLoggerSqlite = tenant.sqlite;
  globalThis.__calorieLoggerDb = tenant.db;
  return tenant.db;
}

/** Drop entries and reset goals; keep seeded foods (tests only). */
export function clearEntriesForTests(): void {
  const sqlite =
    currentTenantOrNull()?.sqlite ?? globalThis.__calorieLoggerSqlite;
  if (!sqlite) return;
  sqlite.exec("DELETE FROM entries");
  sqlite.exec("DELETE FROM settings");
  sqlite
    .prepare(
      "UPDATE goals SET calories = 2000, protein = 120, carbs = 225, fat = 65 WHERE id = 1",
    )
    .run();
}

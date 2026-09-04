import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDatabaseFile, type DrizzleDb } from "@/db/open";
import type { AppUser } from "@/lib/auth/session";

export class NoUserScopeError extends Error {
  constructor() {
    super("No user scope. Data APIs run inside withUser.");
    this.name = "NoUserScopeError";
  }
}

export interface UserHome {
  userId: string;
  rootDir: string;
  dbPath: string;
  claudeConfigDir: string;
  codexHome: string;
}

export interface Tenant {
  user: AppUser;
  home: UserHome;
  db: DrizzleDb;
  sqlite: import("better-sqlite3").Database;
  slots: Map<string, unknown>;
}

type Handle = { tenant: Tenant };

const scope = new AsyncLocalStorage<Tenant>();

const g = globalThis as unknown as {
  __calorieLoggerHandles?: Map<string, Handle>;
  __calorieLoggerAmbient?: Tenant;
};

function handles(): Map<string, Handle> {
  if (!g.__calorieLoggerHandles) g.__calorieLoggerHandles = new Map();
  return g.__calorieLoggerHandles;
}

export function dataRoot(): string {
  if (process.env.MACRO_DATA_DIR) {
    return /*turbopackIgnore: true*/ process.env.MACRO_DATA_DIR;
  }
  if (process.env.VERCEL) {
    return path.join(
      /*turbopackIgnore: true*/ os.tmpdir(),
      "calorie-logger",
      "users",
    );
  }
  return path.join(process.cwd(), "data", "users");
}

export function homeFor(userId: string, dbPath?: string): UserHome {
  const rootDir = path.join(/*turbopackIgnore: true*/ dataRoot(), userId);
  return {
    userId,
    rootDir,
    dbPath: dbPath ?? path.join(rootDir, "app.db"),
    claudeConfigDir: path.join(rootDir, "claude"),
    codexHome: path.join(rootDir, "codex"),
  };
}

function claimLegacyAppDb(userId: string, dest: string): boolean {
  const legacy = process.env.CALORIE_LOGGER_DB_PATH
    ? process.env.CALORIE_LOGGER_DB_PATH
    : path.join(process.cwd(), "data", "app.db");
  if (!fs.existsSync(legacy) || fs.existsSync(dest)) return false;
  const claim = path.join(dataRoot(), ".legacy-owner");
  fs.mkdirSync(dataRoot(), { recursive: true });
  try {
    fs.writeFileSync(claim, userId, { flag: "wx" });
  } catch {
    const owner = fs.readFileSync(claim, "utf8");
    if (owner !== userId) return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(legacy, dest);
  for (const suffix of ["-wal", "-shm"]) {
    const side = legacy + suffix;
    if (fs.existsSync(side)) fs.renameSync(side, dest + suffix);
  }
  return true;
}

function closeSqlite(sqlite: import("better-sqlite3").Database): void {
  try {
    sqlite.close();
  } catch {
    /* already closed */
  }
}

export function tenantFor(user: AppUser, dbPath?: string): Tenant {
  const existing = handles().get(user.id);
  if (existing && (!dbPath || existing.tenant.home.dbPath === dbPath)) {
    return existing.tenant;
  }
  if (existing) {
    closeSqlite(existing.tenant.sqlite);
    handles().delete(user.id);
  }
  const home = homeFor(user.id, dbPath);
  fs.mkdirSync(home.claudeConfigDir, { recursive: true });
  fs.mkdirSync(home.codexHome, { recursive: true });
  if (!fs.existsSync(/*turbopackIgnore: true*/ home.dbPath)) {
    claimLegacyAppDb(user.id, home.dbPath);
  }
  const opened = openDatabaseFile(home.dbPath);
  const tenant: Tenant = {
    user,
    home,
    db: opened.db,
    sqlite: opened.sqlite,
    slots: new Map(),
  };
  handles().set(user.id, { tenant });
  return tenant;
}

export function currentTenant(): Tenant {
  const tenant = scope.getStore() ?? g.__calorieLoggerAmbient;
  if (!tenant) {
    throw new NoUserScopeError();
  }
  return tenant;
}

export function currentTenantOrNull(): Tenant | null {
  return scope.getStore() ?? g.__calorieLoggerAmbient ?? null;
}

export function runAsUser<T>(user: AppUser, fn: () => T, dbPath?: string): T {
  return scope.run(tenantFor(user, dbPath), fn);
}

export function pinAmbientTenant(tenant: Tenant): void {
  g.__calorieLoggerAmbient = tenant;
}

export function clearTenantHandles(): void {
  for (const handle of handles().values()) {
    closeSqlite(handle.tenant.sqlite);
  }
  g.__calorieLoggerHandles = new Map();
  g.__calorieLoggerAmbient = undefined;
  globalThis.__calorieLoggerSqlite = undefined;
  globalThis.__calorieLoggerDb = undefined;
}

export function slot<T>(key: string, create: () => T): T {
  const tenant = currentTenant();
  const existing = tenant.slots.get(key);
  if (existing !== undefined) return existing as T;
  const value = create();
  tenant.slots.set(key, value);
  return value;
}

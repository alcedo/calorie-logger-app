import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { SEED_FOODS } from "./seed-data";
import { normalizeFoodName } from "../lib/normalize";

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

export type DrizzleDb = BetterSQLite3Database<typeof schema>;

export function openDatabaseFile(filePath: string): {
  db: DrizzleDb;
  sqlite: Database.Database;
} {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot create SQLite directory for ${filePath}: ${reason}`);
  }
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);

  sqlite
    .prepare(
      "INSERT INTO goals (id, calories, protein, carbs, fat) VALUES (1, 2000, 120, 225, 65) ON CONFLICT(id) DO NOTHING",
    )
    .run();

  const { n } = sqlite.prepare("SELECT COUNT(*) AS n FROM foods").get() as {
    n: number;
  };
  if (n === 0) {
    const insert = sqlite.prepare(
      `INSERT INTO foods
        (name, normalized_name, aliases, serving_size, serving_unit,
         calories, protein, carbs, fat, fiber, sugar, sodium, source)
       VALUES
        (@name, @normalizedName, @aliases, @servingSize, @servingUnit,
         @calories, @protein, @carbs, @fat, @fiber, @sugar, @sodium, 'seed')
       ON CONFLICT(normalized_name) DO NOTHING`,
    );
    const seedAll = sqlite.transaction(() => {
      for (const f of SEED_FOODS) {
        insert.run({
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
        });
      }
    });
    seedAll();
  }

  return { db: drizzle(sqlite, { schema }), sqlite };
}

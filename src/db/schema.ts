import {
  sqliteTable,
  integer,
  real,
  text,
} from "drizzle-orm/sqlite-core";

export const foods = sqliteTable("foods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // lowercase, trimmed, singularized-ish key used for lookups
  normalizedName: text("normalized_name").notNull().unique(),
  // JSON array of normalized alias strings
  aliases: text("aliases").notNull().default("[]"),
  servingSize: real("serving_size").notNull(),
  servingUnit: text("serving_unit").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  sodium: real("sodium").notNull().default(0), // mg
  source: text("source", { enum: ["seed", "ai", "user"] })
    .notNull()
    .default("user"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // YYYY-MM-DD in the user's local day, used for daily grouping
  date: text("date").notNull(),
  loggedAt: text("logged_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  foodId: integer("food_id").references(() => foods.id, {
    onDelete: "set null",
  }),
  // denormalized so history survives food edits/deletes
  foodName: text("food_name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  rawInput: text("raw_input"),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey(),
  calories: real("calories").notNull().default(2000),
  protein: real("protein").notNull().default(120),
  carbs: real("carbs").notNull().default(225),
  fat: real("fat").notNull().default(65),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
export type Goals = typeof goals.$inferSelect;

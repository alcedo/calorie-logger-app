import { db, ensureDb } from "@/db";
import { foods, type Food } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeFoodName } from "./normalize";

/**
 * Look up a food in the local database. Strategy, in order:
 * 1. exact match on normalized_name
 * 2. alias match
 * 3. token-overlap fuzzy match (all query tokens contained in a food's
 *    name tokens or vice versa), preferring the closest token count
 */
export async function findFood(query: string): Promise<Food | undefined> {
  const key = normalizeFoodName(query);
  if (!key) return undefined;

  await ensureDb();
  const exact = await db
    .select()
    .from(foods)
    .where(eq(foods.normalizedName, key))
    .get();
  if (exact) return exact;

  const all = await db.select().from(foods).all();

  for (const f of all) {
    const aliases: string[] = JSON.parse(f.aliases || "[]");
    if (aliases.includes(key)) return f;
  }

  const queryTokens = new Set(key.split(" "));
  let best: Food | undefined;
  let bestScore = 0;
  for (const f of all) {
    const candidates = [f.normalizedName, ...JSON.parse(f.aliases || "[]")];
    for (const cand of candidates) {
      const candTokens = new Set<string>(cand.split(" "));
      const overlap = [...queryTokens].filter((t) => candTokens.has(t)).length;
      if (overlap === 0) continue;
      const containment =
        overlap === queryTokens.size || overlap === candTokens.size;
      if (!containment) continue;
      // require the overlap to cover at least half of the longer name, so
      // "dragonfruit smoothie bowl" does not collapse into "smoothie"
      if (overlap / Math.max(queryTokens.size, candTokens.size) < 0.5) continue;
      // prefer higher overlap, then smaller size difference
      const score =
        overlap * 10 - Math.abs(queryTokens.size - candTokens.size);
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
  }
  return best;
}

export interface FoodNutritionInput {
  name: string;
  aliases?: string[];
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  source: "seed" | "ai" | "user";
}

/** Insert a food into the cache; returns the stored row. */
export async function cacheFood(input: FoodNutritionInput): Promise<Food> {
  const normalizedName = normalizeFoodName(input.name);
  await ensureDb();
  const existing = await db
    .select()
    .from(foods)
    .where(eq(foods.normalizedName, normalizedName))
    .get();
  if (existing) return existing;

  const inserted = await db
    .insert(foods)
    .values({
      name: input.name,
      normalizedName,
      aliases: JSON.stringify(
        (input.aliases ?? []).map((a) => normalizeFoodName(a))
      ),
      servingSize: input.servingSize,
      servingUnit: input.servingUnit,
      calories: input.calories,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      fiber: input.fiber ?? 0,
      sugar: input.sugar ?? 0,
      sodium: input.sodium ?? 0,
      source: input.source,
    })
    .returning()
    .get();
  if (!inserted) {
    throw new Error("Failed to cache food");
  }
  return inserted;
}

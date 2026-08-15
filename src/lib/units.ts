import type { Food } from "@/db/schema";

const GRAM_FACTORS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.6,
  lbs: 453.6,
  pound: 453.6,
  pounds: 453.6,
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
};

const SERVING_UNITS = new Set(["serving", "servings", "portion", "portions"]);

/** Gram (or mL) weight of one serving, if derivable from the food row. */
function servingGramWeight(food: Food): number | null {
  const unit = food.servingUnit.trim().toLowerCase();
  if (unit === "g" || unit === "grams" || unit === "ml") {
    return food.servingSize;
  }
  const m = food.servingUnit.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\)/i);
  return m ? parseFloat(m[1]) : null;
}

/**
 * How many servings of `food` does `quantity unit` represent?
 *
 * - "serving"/"portion" count whole servings
 * - weight/volume units divide by the serving's gram weight
 * - piece/cup/slice-style units divide by servingSize when the serving is
 *   defined as a count of those pieces (e.g. "5 crackers", "0.5 avocado"),
 *   with a fallback to a count embedded in the unit ("g (23 almonds)")
 */
export function servingsFor(
  quantity: number,
  unit: string,
  food: Food
): number {
  const u = unit.trim().toLowerCase();

  if (SERVING_UNITS.has(u) || u === "") return quantity;

  if (u in GRAM_FACTORS) {
    const gramWeight = servingGramWeight(food);
    if (gramWeight && gramWeight > 0) {
      return (quantity * GRAM_FACTORS[u]) / gramWeight;
    }
    return quantity; // no weight info; treat as servings
  }

  const servingUnitLower = food.servingUnit.trim().toLowerCase();
  const gramBasedServing =
    servingUnitLower === "g" || /^g\b/.test(servingUnitLower);

  if (gramBasedServing) {
    // e.g. serving "28 g (23 almonds)" and user logged "10 almonds"
    const countMatch = food.servingUnit.match(/\((\d+(?:\.\d+)?)\s+[a-z]+\)/i);
    if (countMatch) return quantity / parseFloat(countMatch[1]);
    return quantity; // e.g. "1 piece" of a 100 g food -> 1 serving
  }

  // Serving is a count of natural units (1 cup, 5 crackers, 0.5 avocado)
  return quantity / food.servingSize;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export function macrosForServings(food: Food, servings: number): MacroTotals {
  const r = (v: number) => Math.round(v * servings * 10) / 10;
  return {
    calories: Math.round(food.calories * servings),
    protein: r(food.protein),
    carbs: r(food.carbs),
    fat: r(food.fat),
    fiber: r(food.fiber),
    sugar: r(food.sugar),
    sodium: Math.round(food.sodium * servings),
  };
}

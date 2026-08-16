import { describe, expect, it } from "vitest";
import { SEED_FOODS } from "./seed-data";
import { normalizeFoodName } from "@/lib/normalize";

describe("SEED_FOODS", () => {
  it("contains at least 100 foods", () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(100);
  });

  it("requires core nutrition fields on every item", () => {
    for (const food of SEED_FOODS) {
      expect(food.name.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(food.servingSize)).toBe(true);
      expect(food.servingUnit.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(food.calories)).toBe(true);
      expect(Number.isFinite(food.protein)).toBe(true);
      expect(Number.isFinite(food.carbs)).toBe(true);
      expect(Number.isFinite(food.fat)).toBe(true);
    }
  });

  it("includes Egg and Chicken Breast", () => {
    const names = SEED_FOODS.map((f) => f.name);
    expect(names).toContain("Egg");
    expect(names).toContain("Chicken Breast");
  });

  it("has unique normalized names", () => {
    const keys = SEED_FOODS.map((f) => normalizeFoodName(f.name));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

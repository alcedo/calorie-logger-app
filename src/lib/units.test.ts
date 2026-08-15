import { describe, expect, it } from "vitest";
import { makeFood } from "@/test/helpers";
import { macrosForServings, servingsFor } from "./units";

describe("servingsFor", () => {
  const chicken = makeFood();
  const almonds = makeFood({
    name: "Almonds",
    servingSize: 28,
    servingUnit: "g (23 almonds)",
    calories: 164,
    protein: 6,
    carbs: 6.1,
    fat: 14.2,
  });
  const crackers = makeFood({
    name: "Crackers",
    servingSize: 5,
    servingUnit: "crackers",
    calories: 60,
  });

  it("treats serving/portion/empty as whole servings", () => {
    expect(servingsFor(2, "serving", chicken)).toBe(2);
    expect(servingsFor(2, "servings", chicken)).toBe(2);
    expect(servingsFor(3, "portion", chicken)).toBe(3);
    expect(servingsFor(1.5, "", chicken)).toBe(1.5);
  });

  it("converts gram weights using serving size", () => {
    expect(servingsFor(200, "g", chicken)).toBe(2);
  });

  it("applies kg and oz conversion factors", () => {
    expect(servingsFor(1, "kg", chicken)).toBe(10);
    expect(servingsFor(1, "oz", chicken)).toBeCloseTo(0.2835, 4);
  });

  it("falls back to quantity when no gram weight is available", () => {
    expect(servingsFor(2, "g", crackers)).toBe(2);
  });

  it("uses embedded count for gram-based servings", () => {
    expect(servingsFor(10, "almonds", almonds)).toBeCloseTo(10 / 23, 6);
  });

  it("divides by servingSize for count-based servings", () => {
    expect(servingsFor(10, "crackers", crackers)).toBe(2);
  });
});

describe("macrosForServings", () => {
  const chicken = makeFood();

  it("scales macros and rounds calories/sodium; macros to 1 decimal", () => {
    const macros = macrosForServings(chicken, 2);
    expect(macros).toEqual({
      calories: 330,
      protein: 62,
      carbs: 0,
      fat: 7.2,
      fiber: 0,
      sugar: 0,
      sodium: 148,
    });
  });

  it("rounds fractional servings correctly", () => {
    const macros = macrosForServings(chicken, 0.5);
    expect(macros.calories).toBe(83);
    expect(macros.protein).toBe(15.5);
    expect(macros.fat).toBe(1.8);
    expect(macros.sodium).toBe(37);
  });
});

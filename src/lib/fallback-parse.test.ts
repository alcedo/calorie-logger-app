import { describe, expect, it } from "vitest";
import { fallbackParse } from "./fallback-parse";

describe("fallbackParse", () => {
  it("parses the canonical smoke phrase", () => {
    expect(fallbackParse("2 eggs and 200g chicken breast")).toEqual([
      { name: "eggs", quantity: 2, unit: "serving" },
      { name: "chicken breast", quantity: 200, unit: "g" },
    ]);
  });

  it("splits on commas, semicolons, with, plus, and newlines", () => {
    const items = fallbackParse(
      "2 eggs, 1 banana; 1 yogurt with 1 honey\nplus 1 coffee"
    );
    expect(items.map((i) => i.name)).toEqual([
      "eggs",
      "banana",
      "yogurt",
      "honey",
      "coffee",
    ]);
  });

  it("handles word numbers and known units", () => {
    expect(fallbackParse("a bowl of oatmeal")).toEqual([
      { name: "oatmeal", quantity: 1, unit: "bowl" },
    ]);
    expect(fallbackParse("half cup rice")).toEqual([
      { name: "rice", quantity: 0.5, unit: "cup" },
    ]);
    expect(fallbackParse("two slices bread")).toEqual([
      { name: "bread", quantity: 2, unit: "slice" },
    ]);
  });

  it("parses decimal quantities and singularizes known units", () => {
    expect(fallbackParse("1.5 cups rice")).toEqual([
      { name: "rice", quantity: 1.5, unit: "cup" },
    ]);
  });

  it("defaults quantity 1 and unit serving for numbered items", () => {
    expect(fallbackParse("1 banana")).toEqual([
      { name: "banana", quantity: 1, unit: "serving" },
    ]);
  });

  it("treats unknown qty words as part of the name", () => {
    expect(fallbackParse("spicy chicken")).toEqual([
      { name: "spicy chicken", quantity: 1, unit: "serving" },
    ]);
  });

  it("returns empty array for empty or separator-only input", () => {
    expect(fallbackParse("")).toEqual([]);
    expect(fallbackParse("   ")).toEqual([]);
    expect(fallbackParse("and , with")).toEqual([]);
  });

  it("parses attached units without a space", () => {
    expect(fallbackParse("200g chicken")).toEqual([
      { name: "chicken", quantity: 200, unit: "g" },
    ]);
  });
});

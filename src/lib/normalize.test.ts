import { describe, expect, it } from "vitest";
import { normalizeFoodName } from "./normalize";

describe("normalizeFoodName", () => {
  it("lowercases and trims", () => {
    expect(normalizeFoodName("  Egg ")).toBe("egg");
  });

  it("strips punctuation", () => {
    expect(normalizeFoodName("Eggs!!!")).toBe("egg");
  });

  it("collapses whitespace", () => {
    expect(normalizeFoodName("chicken   breast")).toBe("chicken breast");
  });

  it("singularizes simple plurals", () => {
    expect(normalizeFoodName("eggs")).toBe("egg");
  });

  it("converts ies to y", () => {
    expect(normalizeFoodName("berries")).toBe("berry");
  });

  it("strips es from oes/ches/shes/xes/zes/ses", () => {
    expect(normalizeFoodName("tomatoes")).toBe("tomato");
    expect(normalizeFoodName("peaches")).toBe("peach");
  });

  it("keeps words ending in ss, us, or is", () => {
    expect(normalizeFoodName("glass")).toBe("glass");
    expect(normalizeFoodName("hummus")).toBe("hummus");
  });

  it("leaves short words (<=3 chars) unchanged", () => {
    expect(normalizeFoodName("oil")).toBe("oil");
    expect(normalizeFoodName("pea")).toBe("pea");
  });

  it("preserves percent signs", () => {
    expect(normalizeFoodName("2% milk")).toBe("2% milk");
  });

  it("returns empty string for blank input", () => {
    expect(normalizeFoodName("")).toBe("");
    expect(normalizeFoodName("   ")).toBe("");
  });
});

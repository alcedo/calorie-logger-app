import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatSearchResultsForPrompt,
  parseDuckDuckGoHtml,
  searchNutritionWeb,
  searchQueryFor,
} from "./nutrition-search";

const DDG_HTML = `
<html><body>
  <a class="result__a" href="https://duckduckgo.com/l/?uddg=${encodeURIComponent("https://fdc.nal.usda.gov/food-details/1/nutrients")}">Banana, raw</a>
  <a class="result__snippet">A medium banana has about 105 kcal.</a>
</body></html>
`;

describe("parseDuckDuckGoHtml", () => {
  it("extracts title, decoded url, and snippet", () => {
    const hits = parseDuckDuckGoHtml(DDG_HTML);
    expect(hits).toHaveLength(1);
    expect(hits[0].title).toBe("Banana, raw");
    expect(hits[0].url).toBe("https://fdc.nal.usda.gov/food-details/1/nutrients");
    expect(hits[0].snippet).toMatch(/105 kcal/);
    expect(hits[0].source).toBe("web");
  });
});

describe("searchNutritionWeb", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges USDA, Open Food Facts, and web hits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("api.nal.usda.gov")) {
          return new Response(
            JSON.stringify({
              foods: [
                {
                  fdcId: 173944,
                  description: "Bananas, raw",
                  dataType: "SR Legacy",
                  foodNutrients: [
                    { nutrientName: "Energy", value: 89, unitName: "kcal" },
                    { nutrientName: "Protein", value: 1.1, unitName: "g" },
                  ],
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.includes("openfoodfacts.org")) {
          return new Response(
            JSON.stringify({
              products: [
                {
                  product_name: "Organic Banana",
                  brands: "Dole",
                  code: "123",
                  nutriments: { "energy-kcal_100g": 89, proteins_100g: 1.1 },
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.includes("duckduckgo.com")) {
          return new Response(DDG_HTML, { status: 200 });
        }
        return new Response("nope", { status: 404 });
      }),
    );

    const hits = await searchNutritionWeb("banana");
    expect(hits.some((h) => h.source === "usda")).toBe(true);
    expect(hits.some((h) => h.source === "openfoodfacts")).toBe(true);
    expect(hits.some((h) => h.source === "web")).toBe(true);
    expect(searchQueryFor("banana")).toMatch(/USDA/);
  });

  it("formats prompt blocks for the LLM", () => {
    const text = formatSearchResultsForPrompt(
      new Map([
        [
          "banana",
          [
            {
              title: "Bananas, raw",
              url: "https://example.com",
              snippet: "89 kcal",
              source: "usda" as const,
            },
          ],
        ],
      ]),
    );
    expect(text).toContain("### banana");
    expect(text).toContain("[usda]");
    expect(text).toContain("89 kcal");
  });
});

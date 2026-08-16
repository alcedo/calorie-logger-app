import type { LogSearchHitDto } from "./log-trace";

export type NutritionSearchHit = LogSearchHitDto;

const FETCH_MS = 8_000;
const UA = "MacroCalorieLogger/0.1 (personal calorie tracker)";

function usdaKey(): string {
  return process.env.USDA_API_KEY?.trim() || "DEMO_KEY";
}

async function fetchText(
  url: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; text: string }> {
  const signal =
    init.signal ??
    (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(FETCH_MS)
      : undefined);
  try {
    const res = await fetch(url, {
      ...init,
      signal,
      headers: { "User-Agent": UA, Accept: "application/json, text/html", ...init.headers },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

function nutrientMap(
  nutrients: Array<{ nutrientName?: string; nutrientNumber?: string; value?: number; unitName?: string }>,
): string {
  const pick = (names: string[]) =>
    nutrients.find((n) =>
      names.some((name) =>
        (n.nutrientName ?? "").toLowerCase().includes(name.toLowerCase()),
      ),
    );
  const energy = pick(["energy"]);
  const protein = pick(["protein"]);
  const carbs = pick(["carbohydrate"]);
  const fat = pick(["total lipid", "total fat"]);
  const fiber = pick(["fiber"]);
  const sugar = pick(["sugars"]);
  const sodium = pick(["sodium"]);
  const fmt = (n: typeof energy, fallbackUnit: string) =>
    n && typeof n.value === "number"
      ? `${n.value} ${n.unitName || fallbackUnit}`
      : null;
  return [
    fmt(energy, "kcal") ? `${fmt(energy, "kcal")} energy` : null,
    fmt(protein, "g") ? `${fmt(protein, "g")} protein` : null,
    fmt(carbs, "g") ? `${fmt(carbs, "g")} carbs` : null,
    fmt(fat, "g") ? `${fmt(fat, "g")} fat` : null,
    fmt(fiber, "g") ? `${fmt(fiber, "g")} fiber` : null,
    fmt(sugar, "g") ? `${fmt(sugar, "g")} sugar` : null,
    fmt(sodium, "mg") ? `${fmt(sodium, "mg")} sodium` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

async function searchUsda(foodName: string): Promise<NutritionSearchHit[]> {
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?` +
    new URLSearchParams({
      query: foodName,
      pageSize: "3",
      api_key: usdaKey(),
    }).toString();
  const { ok, text } = await fetchText(url);
  if (!ok || !text) return [];
  let parsed: {
    foods?: Array<{
      fdcId?: number;
      description?: string;
      dataType?: string;
      foodNutrients?: Array<{
        nutrientName?: string;
        value?: number;
        unitName?: string;
      }>;
    }>;
  };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return [];
  }
  const hits: NutritionSearchHit[] = [];
  for (const food of parsed.foods ?? []) {
    if (!food.description) continue;
    const macros = nutrientMap(food.foodNutrients ?? []);
    const id = food.fdcId;
    hits.push({
      title: `${food.description}${food.dataType ? ` (${food.dataType})` : ""}`,
      url: id
        ? `https://fdc.nal.usda.gov/food-details/${id}/nutrients`
        : "https://fdc.nal.usda.gov/",
      snippet: macros
        ? `Per 100 g (USDA): ${macros}`
        : "USDA FoodData Central match",
      source: "usda",
    });
  }
  return hits;
}

async function searchOpenFoodFacts(foodName: string): Promise<NutritionSearchHit[]> {
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?` +
    new URLSearchParams({
      search_terms: foodName,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "3",
    }).toString();
  const { ok, text } = await fetchText(url);
  if (!ok || !text) return [];
  let parsed: {
    products?: Array<{
      product_name?: string;
      brands?: string;
      url?: string;
      code?: string;
      nutriments?: Record<string, number | string | undefined>;
    }>;
  };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return [];
  }
  const hits: NutritionSearchHit[] = [];
  for (const product of parsed.products ?? []) {
    const name = product.product_name?.trim();
    if (!name) continue;
    const n = product.nutriments ?? {};
    const parts = [
      n["energy-kcal_100g"] != null ? `${n["energy-kcal_100g"]} kcal` : null,
      n.proteins_100g != null ? `${n.proteins_100g} g protein` : null,
      n.carbohydrates_100g != null ? `${n.carbohydrates_100g} g carbs` : null,
      n.fat_100g != null ? `${n.fat_100g} g fat` : null,
    ].filter(Boolean);
    const code = product.code;
    hits.push({
      title: product.brands ? `${name} — ${product.brands}` : name,
      url:
        product.url ||
        (code
          ? `https://world.openfoodfacts.org/product/${code}`
          : "https://world.openfoodfacts.org/"),
      snippet: parts.length
        ? `Per 100 g (Open Food Facts): ${parts.join(", ")}`
        : "Open Food Facts product match",
      source: "openfoodfacts",
    });
  }
  return hits;
}

function decodeDuckDuckGoUrl(href: string): string {
  try {
    const parsed = new URL(href, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return href;
  } catch {
    return href;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDuckDuckGoHtml(html: string): NutritionSearchHit[] {
  const hits: NutritionSearchHit[] = [];
  const resultRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = resultRe.exec(html)) && hits.length < 5) {
    const url = decodeDuckDuckGoUrl(match[1]);
    const title = stripTags(match[2]);
    if (!title || !url.startsWith("http")) continue;
    const after = html.slice(match.index, match.index + 1200);
    const snippetMatch = after.match(
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>/i,
    );
    hits.push({
      title,
      url,
      snippet: snippetMatch ? stripTags(snippetMatch[1]).slice(0, 280) : title,
      source: "web",
    });
  }
  return hits;
}

async function searchDuckDuckGo(foodName: string): Promise<NutritionSearchHit[]> {
  const q = `${foodName} nutrition facts calories protein USDA`;
  const url =
    `https://html.duckduckgo.com/html/?` +
    new URLSearchParams({ q }).toString();
  const { ok, text } = await fetchText(url, {
    headers: { Accept: "text/html" },
  });
  if (!ok || !text) return [];
  return parseDuckDuckGoHtml(text);
}

export function searchQueryFor(foodName: string): string {
  return `${foodName} nutrition facts calories protein carbs fat USDA`;
}

export async function searchNutritionWeb(
  foodName: string,
): Promise<NutritionSearchHit[]> {
  const [usda, off, web] = await Promise.all([
    searchUsda(foodName),
    searchOpenFoodFacts(foodName),
    searchDuckDuckGo(foodName),
  ]);
  const seen = new Set<string>();
  const merged: NutritionSearchHit[] = [];
  for (const hit of [...usda, ...off, ...web]) {
    const key = hit.url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(hit);
  }
  return merged.slice(0, 8);
}

export function formatSearchResultsForPrompt(
  byFood: Map<string, NutritionSearchHit[]>,
): string {
  const blocks: string[] = [];
  for (const [name, hits] of byFood) {
    if (hits.length === 0) {
      blocks.push(`### ${name}\n(no web results)`);
      continue;
    }
    const lines = hits.map(
      (h, i) =>
        `${i + 1}. [${h.source}] ${h.title}\n   ${h.snippet}\n   ${h.url}`,
    );
    blocks.push(`### ${name}\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

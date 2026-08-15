import type { ParsedFoodItem } from "./ai";

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
};

const KNOWN_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "oz",
  "ounce",
  "ounces",
  "ml",
  "l",
  "cup",
  "cups",
  "bowl",
  "bowls",
  "slice",
  "slices",
  "piece",
  "pieces",
  "serving",
  "servings",
  "tbsp",
  "tsp",
  "glass",
  "glasses",
  "can",
  "cans",
  "bottle",
  "bottles",
  "scoop",
  "scoops",
  "bar",
  "bars",
]);

/**
 * Naive parser used when no AI key is configured. Handles inputs like
 * "2 eggs, a bowl of oatmeal and 200g chicken breast".
 */
export function fallbackParse(text: string): ParsedFoodItem[] {
  const segments = text
    .toLowerCase()
    .split(/,|;|\band\b|\bwith\b|\bplus\b|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: ParsedFoodItem[] = [];
  for (const segment of segments) {
    // "200g chicken" / "1.5 cups rice" / "2 eggs" / "a bowl of oatmeal"
    const m = segment.match(
      /^(\d+(?:\.\d+)?|[a-z]+)?\s*(g|grams?|kg|oz|ounces?|ml|l)?\s*(?:of\s+)?(.+)$/
    );
    if (!m) continue;

    let quantity = 1;
    let unit = "serving";
    const [, qtyRaw, unitAttached, restRaw] = m;
    let rest = restRaw?.trim() ?? "";
    if (!rest) continue;

    if (qtyRaw) {
      const parsedNum = parseFloat(qtyRaw);
      if (!Number.isNaN(parsedNum)) {
        quantity = parsedNum;
      } else if (qtyRaw in WORD_NUMBERS) {
        quantity = WORD_NUMBERS[qtyRaw];
      } else {
        rest = `${qtyRaw} ${rest}`.trim(); // not a number; part of the name
      }
    }

    if (unitAttached) {
      unit = unitAttached;
    } else {
      // "bowl of oatmeal" -> unit "bowl", name "oatmeal"
      const words = rest.split(/\s+/);
      if (words.length > 1 && KNOWN_UNITS.has(words[0])) {
        unit = words[0].replace(/s$/, "");
        rest = words.slice(1).join(" ").replace(/^of\s+/, "");
      }
    }

    if (rest) items.push({ name: rest, quantity, unit });
  }
  return items;
}

import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

export function aiAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI {
  if (!aiAvailable()) {
    throw new AiUnavailableError(
      "AI is not configured. Set OPENAI_API_KEY to enable parsing of free-form meals and nutrition lookup for unknown foods."
    );
  }
  if (!client) client = new OpenAI();
  return client;
}

export class AiUnavailableError extends Error {}

export interface ParsedFoodItem {
  name: string;
  quantity: number;
  unit: string;
}

const PARSE_SCHEMA = {
  name: "meal_items",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "quantity", "unit"],
          properties: {
            name: {
              type: "string",
              description:
                "Generic food name, singular, no quantities (e.g. 'egg', 'white rice', 'chicken breast')",
            },
            quantity: {
              type: "number",
              description:
                "How many servings/units were eaten. Default 1 when unspecified.",
            },
            unit: {
              type: "string",
              description:
                "Unit for the quantity: 'serving', 'g', 'cup', 'slice', 'piece', 'bowl', etc.",
            },
          },
        },
      },
    },
  },
} as const;

/** Parse free-form meal text into structured food items. */
export async function parseMealText(text: string): Promise<ParsedFoodItem[]> {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You extract food items from a user's meal description for a calorie tracker.",
          "Rules:",
          "- Split the text into individual foods with quantity and unit.",
          "- Use generic singular food names without brands unless the brand matters ('big mac').",
          "- 'a bowl of oatmeal' -> name 'oatmeal', quantity 1, unit 'bowl'.",
          "- '200g chicken breast' -> name 'chicken breast', quantity 200, unit 'g'.",
          "- If no quantity is given, use quantity 1 and unit 'serving'.",
          "- Ignore anything that is not food or drink.",
        ].join("\n"),
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_schema", json_schema: PARSE_SCHEMA },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return [];
  const parsed = JSON.parse(content) as { items: ParsedFoodItem[] };
  return parsed.items.filter((i) => i.name.trim().length > 0);
}

export interface AiNutrition {
  name: string;
  aliases: string[];
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

const NUTRITION_SCHEMA = {
  name: "food_nutrition",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "aliases",
      "servingSize",
      "servingUnit",
      "calories",
      "protein",
      "carbs",
      "fat",
      "fiber",
      "sugar",
      "sodium",
    ],
    properties: {
      name: { type: "string", description: "Canonical display name" },
      aliases: {
        type: "array",
        items: { type: "string" },
        description: "Common alternative names",
      },
      servingSize: { type: "number" },
      servingUnit: {
        type: "string",
        description: "e.g. 'g', 'cup (240 g)', 'medium apple (182 g)'",
      },
      calories: { type: "number", description: "kcal per serving" },
      protein: { type: "number", description: "grams per serving" },
      carbs: { type: "number", description: "grams per serving" },
      fat: { type: "number", description: "grams per serving" },
      fiber: { type: "number", description: "grams per serving" },
      sugar: { type: "number", description: "grams per serving" },
      sodium: { type: "number", description: "milligrams per serving" },
    },
  },
} as const;

/** Ask the LLM for accurate per-serving nutrition for an unknown food. */
export async function lookupNutrition(foodName: string): Promise<AiNutrition> {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are a nutrition database. Given a food name, return its most",
          "accurate, up-to-date nutrition facts per one natural serving,",
          "based on USDA FoodData Central or official brand data.",
          "Choose the serving people typically log (1 medium fruit, 1 slice,",
          "100 g for meats, 1 cup for cooked grains). Include the gram",
          "weight in servingUnit when the unit is not grams.",
        ].join("\n"),
      },
      { role: "user", content: `Nutrition facts for: ${foodName}` },
    ],
    response_format: { type: "json_schema", json_schema: NUTRITION_SCHEMA },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`No nutrition data returned for "${foodName}"`);
  return JSON.parse(content) as AiNutrition;
}

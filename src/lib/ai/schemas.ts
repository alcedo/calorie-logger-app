/** Plain JSON Schema (draft-07 compatible). No `$schema` — Claude validates as draft-07. */

export const PARSE_SYSTEM = [
  "You extract food items from a user's meal description for a calorie tracker.",
  "Rules:",
  "- Split the text into individual foods with quantity and unit.",
  "- Use generic singular food names without brands unless the brand matters ('big mac').",
  "- 'a bowl of oatmeal' -> name 'oatmeal', quantity 1, unit 'bowl'.",
  "- '200g chicken breast' -> name 'chicken breast', quantity 200, unit 'g'.",
  "- If no quantity is given, use quantity 1 and unit 'serving'.",
  "- Ignore anything that is not food or drink.",
  "- Put a short reasoning in `reasoning`: how you split the sentence and any assumptions.",
].join("\n");

export const PARSE_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["reasoning", "items"],
  properties: {
    reasoning: {
      type: "string",
      description:
        "Brief thought process: how the sentence was split and any quantity/unit assumptions.",
    },
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
};

export const NUTRITION_SYSTEM = [
  "You are a nutrition database. Given one or more food names plus live web",
  "search results (USDA FoodData Central, Open Food Facts, and web pages),",
  "return the most accurate, up-to-date nutrition facts per one natural serving.",
  "Prefer USDA numbers when they match the food; otherwise official brand data.",
  "Choose the serving people typically log (1 medium fruit, 1 slice,",
  "100 g for meats, 1 cup for cooked grains). Include the gram",
  "weight in servingUnit when the unit is not grams.",
  "Return one object per requested food. Set query to the food name exactly as given.",
  "Explain in `reasoning` which sources you trusted and any serving-size assumptions.",
  "List the URLs you relied on in `sources`.",
].join("\n");

const NUTRITION_ITEM_PROPERTIES = {
  query: {
    type: "string",
    description: "The food name exactly as given in the request",
  },
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
} as const;

const NUTRITION_ITEM_REQUIRED = [
  "query",
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
] as const;

export const NUTRITION_ITEM_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [...NUTRITION_ITEM_REQUIRED],
  properties: NUTRITION_ITEM_PROPERTIES,
};

export const BATCH_NUTRITION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["reasoning", "sources", "foods"],
  properties: {
    reasoning: {
      type: "string",
      description:
        "Thought process: which web results you used and how you chose serving sizes.",
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url"],
        properties: {
          title: { type: "string" },
          url: { type: "string" },
        },
      },
    },
    foods: {
      type: "array",
      items: NUTRITION_ITEM_JSON_SCHEMA,
    },
  },
};

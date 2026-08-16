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
].join("\n");

export const PARSE_JSON_SCHEMA: Record<string, unknown> = {
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
};

export const NUTRITION_SYSTEM = [
  "You are a nutrition database. Given one or more food names, return the most",
  "accurate, up-to-date nutrition facts per one natural serving for each,",
  "based on USDA FoodData Central or official brand data.",
  "Choose the serving people typically log (1 medium fruit, 1 slice,",
  "100 g for meats, 1 cup for cooked grains). Include the gram",
  "weight in servingUnit when the unit is not grams.",
  "Return one object per requested food. Set query to the food name exactly as given.",
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
  required: ["foods"],
  properties: {
    foods: {
      type: "array",
      items: NUTRITION_ITEM_JSON_SCHEMA,
    },
  },
};

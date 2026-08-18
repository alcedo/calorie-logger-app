import { db, ensureDb } from "@/db";
import { entries, type Entry, type Food } from "@/db/schema";
import {
  getAiStatus,
  parseMealText,
  lookupNutrition,
  type ParsedFoodItem,
} from "@/lib/ai";
import { fallbackParse } from "@/lib/fallback-parse";
import { findFood, cacheFood } from "@/lib/food-lookup";
import { servingsFor, macrosForServings } from "@/lib/units";
import type { EntryDto } from "@/lib/types";
import type { LogTraceEvent, LogTraceListener } from "@/lib/log-trace";

export interface LogMealInput {
  text: string;
  date: string;
  onEvent?: LogTraceListener;
}

export interface LogMealResult {
  logged: Entry[];
  unresolved: { name: string; reason: string }[];
  usedAiParser: boolean;
  trace: LogTraceEvent[];
}

function toDto(entry: Entry & { foodSource?: string }): EntryDto {
  return {
    id: entry.id,
    date: entry.date,
    loggedAt: entry.loggedAt,
    foodId: entry.foodId,
    foodName: entry.foodName,
    quantity: entry.quantity,
    unit: entry.unit,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    fiber: entry.fiber,
    sugar: entry.sugar,
    sodium: entry.sodium,
    rawInput: entry.rawInput,
  };
}

export async function logMeal(input: LogMealInput): Promise<LogMealResult> {
  const { text, date } = input;
  const trace: LogTraceEvent[] = [];
  const emit: LogTraceListener = (event) => {
    if (event.type !== "done" && event.type !== "error") {
      trace.push(event);
    }
    input.onEvent?.(event);
  };

  const status = await getAiStatus();
  const providerNote = status.aiAvailable
    ? `${status.providerLabel ?? status.provider}${
        status.activeModelLabel ? ` · ${status.activeModelLabel}` : ""
      }`
    : "built-in parser (AI not connected)";

  emit({
    type: "step",
    id: "parse",
    title: "Reading your meal",
    detail: providerNote,
  });

  let items: ParsedFoodItem[];
  let usedAiParser = false;
  if (status.aiAvailable) {
    try {
      items = await parseMealText(text, { onEvent: emit });
      usedAiParser = true;
    } catch (err) {
      console.error("AI parse failed, using fallback parser:", err);
      emit({
        type: "step",
        id: "parse-fallback",
        title: "AI parse failed — using the built-in parser",
        detail: err instanceof Error ? err.message : String(err),
      });
      items = fallbackParse(text);
    }
  } else {
    emit({
      type: "thought",
      text: "No AI provider is connected, so I'm splitting the sentence with the built-in parser (quantities, units, and food names).",
    });
    items = fallbackParse(text);
  }

  if (items.length === 0) {
    return { logged: [], unresolved: [], usedAiParser, trace };
  }

  emit({
    type: "step",
    id: "parsed-items",
    title: `Found ${items.length} food${items.length === 1 ? "" : "s"}`,
    detail: items
      .map((i) => `${i.quantity} ${i.unit} ${i.name}`)
      .join(" · "),
  });

  const logged: Entry[] = [];
  const unresolved: { name: string; reason: string }[] = [];

  type Slot =
    | { item: ParsedFoodItem; food: Food; source: "database" | "ai" }
    | { item: ParsedFoodItem; food: null; source: null };

  const slots: Slot[] = [];
  for (const item of items) {
    const food = await findFood(item.name);
    if (food) {
      emit({
        type: "step",
        id: `db-${item.name}`,
        title: `Matched “${item.name}” in the local database`,
        detail: `${food.name} · ${food.calories} kcal per ${food.servingSize} ${food.servingUnit}`,
      });
      slots.push({ item, food, source: "database" as const });
    } else {
      slots.push({ item, food: null, source: null });
    }
  }

  const missIndexes = slots
    .map((slot, i) => (slot.food ? -1 : i))
    .filter((i) => i >= 0);

  if (missIndexes.length > 0) {
    const missingNames = missIndexes.map((i) => slots[i].item.name);
    if (!status.aiAvailable) {
      const reason =
        status.bannerMessage ??
        "Not in the local database and AI lookup is not configured. Sign in with `claude auth login`.";
      for (const i of missIndexes) {
        emit({
          type: "step",
          id: `miss-${slots[i].item.name}`,
          title: `“${slots[i].item.name}” is not in the database`,
          detail: reason,
        });
        unresolved.push({ name: slots[i].item.name, reason });
      }
    } else {
      emit({
        type: "step",
        id: "web-search",
        title: "Searching the web for up-to-date nutrition",
        detail: missingNames.join(", "),
      });
      const uniqueNames = [...new Set(missingNames)];
      try {
        const nutritionByName = await lookupNutrition(uniqueNames, {
          onEvent: emit,
        });
        for (const i of missIndexes) {
          const item = slots[i].item;
          const nutrition = nutritionByName.get(item.name);
          if (!nutrition) {
            unresolved.push({
              name: item.name,
              reason:
                "AI nutrition lookup did not return this food. Try again or add it manually.",
            });
            continue;
          }
          const food = await cacheFood({ ...nutrition, source: "ai" });
          emit({
            type: "step",
            id: `ai-${item.name}`,
            title: `Cached “${food.name}” from web + AI`,
            detail: `${food.calories} kcal per ${food.servingSize} ${food.servingUnit}`,
          });
          slots[i] = { item, food, source: "ai" };
        }
      } catch (err) {
        console.error("Nutrition lookup failed:", err);
        for (const i of missIndexes) {
          if (!slots[i].food) {
            unresolved.push({
              name: slots[i].item.name,
              reason:
                "AI nutrition lookup failed. Try again or add it manually.",
            });
          }
        }
      }
    }
  }

  for (const slot of slots) {
    if (!slot.food || !slot.source) continue;
    const { item, food, source } = slot;
    const servings = servingsFor(item.quantity, item.unit, food);
    const macros = macrosForServings(food, servings);

    await ensureDb();
    const entry = await db
      .insert(entries)
      .values({
        date,
        foodId: food.id,
        foodName: food.name,
        quantity: item.quantity,
        unit: item.unit,
        ...macros,
        rawInput: text,
      })
      .returning()
      .get();
    if (!entry) continue;

    logged.push({ ...entry, foodSource: source } as Entry & {
      foodSource: string;
    });
  }

  const result: LogMealResult = { logged, unresolved, usedAiParser, trace };
  emit({
    type: "done",
    logged: logged.map((e) => toDto(e)),
    unresolved,
    usedAiParser,
  });
  return result;
}

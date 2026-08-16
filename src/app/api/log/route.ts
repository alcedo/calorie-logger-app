import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text: string | undefined = body?.text?.trim();
  const date: string =
    body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const status = await getAiStatus();

  let items: ParsedFoodItem[];
  let usedAiParser = false;
  if (status.aiAvailable) {
    try {
      items = await parseMealText(text);
      usedAiParser = true;
    } catch (err) {
      console.error("AI parse failed, using fallback parser:", err);
      items = fallbackParse(text);
    }
  } else {
    items = fallbackParse(text);
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Could not find any foods in that message" },
      { status: 422 },
    );
  }

  const logged: Entry[] = [];
  const unresolved: { name: string; reason: string }[] = [];

  type Slot =
    | { item: ParsedFoodItem; food: Food; source: "database" | "ai" }
    | { item: ParsedFoodItem; food: null; source: null };

  const slots: Slot[] = items.map((item) => {
    const food = findFood(item.name);
    if (food) return { item, food, source: "database" as const };
    return { item, food: null, source: null };
  });

  const missIndexes = slots
    .map((slot, i) => (slot.food ? -1 : i))
    .filter((i) => i >= 0);

  if (missIndexes.length > 0) {
    if (!status.aiAvailable) {
      const reason =
        status.bannerMessage ??
        "Not in the local database and AI lookup is not configured. Sign in with `claude auth login`.";
      for (const i of missIndexes) {
        unresolved.push({ name: slots[i].item.name, reason });
      }
    } else {
      const uniqueNames = [
        ...new Set(missIndexes.map((i) => slots[i].item.name)),
      ];
      try {
        const nutritionByName = await lookupNutrition(uniqueNames);
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
          const food = cacheFood({ ...nutrition, source: "ai" });
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

    const entry = db
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

    logged.push({ ...entry, foodSource: source } as Entry & {
      foodSource: string;
    });
  }

  return NextResponse.json({
    logged,
    unresolved,
    usedAiParser,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entries, type Entry } from "@/db/schema";
import {
  aiAvailable,
  parseMealText,
  lookupNutrition,
  type ParsedFoodItem,
} from "@/lib/ai";
import { fallbackParse } from "@/lib/fallback-parse";
import { findFood, cacheFood } from "@/lib/food-lookup";
import { servingsFor, macrosForServings } from "@/lib/units";

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

  // 1. Parse the free-form text into structured items
  let items: ParsedFoodItem[];
  let usedAiParser = false;
  if (aiAvailable()) {
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
      { status: 422 }
    );
  }

  // 2. Resolve each item: local DB first, AI lookup on miss
  const logged: Entry[] = [];
  const unresolved: { name: string; reason: string }[] = [];

  for (const item of items) {
    let food = findFood(item.name);
    let source: "database" | "ai" = "database";

    if (!food) {
      if (!aiAvailable()) {
        unresolved.push({
          name: item.name,
          reason:
            "Not in the local database and AI lookup is not configured (set OPENAI_API_KEY).",
        });
        continue;
      }
      try {
        const nutrition = await lookupNutrition(item.name);
        food = cacheFood({ ...nutrition, source: "ai" });
        source = "ai";
      } catch (err) {
        console.error(`Nutrition lookup failed for "${item.name}":`, err);
        unresolved.push({
          name: item.name,
          reason: "AI nutrition lookup failed. Try again or add it manually.",
        });
        continue;
      }
    }

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

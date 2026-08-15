import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entries, goals } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const date =
    req.nextUrl.searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);

  const dayEntries = db
    .select()
    .from(entries)
    .where(eq(entries.date, date))
    .orderBy(asc(entries.loggedAt))
    .all();

  const totals = dayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + e.fiber,
      sugar: acc.sugar + e.sugar,
      sodium: acc.sodium + e.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );

  const userGoals = db.select().from(goals).where(eq(goals.id, 1)).get();

  return NextResponse.json({ date, entries: dayEntries, totals, goals: userGoals });
}

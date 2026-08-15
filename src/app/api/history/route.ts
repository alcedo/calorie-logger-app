import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { sql, desc, gte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const days = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("days")) || 30, 1),
    365
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows = db
    .select({
      date: entries.date,
      entryCount: sql<number>`count(*)`,
      calories: sql<number>`round(sum(${entries.calories}))`,
      protein: sql<number>`round(sum(${entries.protein}), 1)`,
      carbs: sql<number>`round(sum(${entries.carbs}), 1)`,
      fat: sql<number>`round(sum(${entries.fat}), 1)`,
    })
    .from(entries)
    .where(gte(entries.date, since))
    .groupBy(entries.date)
    .orderBy(desc(entries.date))
    .all();

  return NextResponse.json({ days: rows });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { foods } from "@/db/schema";
import { like, asc } from "drizzle-orm";
import { withUser } from "@/lib/auth";
import { cacheFood } from "@/lib/food-lookup";
import { normalizeFoodName } from "@/lib/normalize";

export const GET = withUser(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const rows = q
    ? db
        .select()
        .from(foods)
        .where(like(foods.normalizedName, `%${normalizeFoodName(q)}%`))
        .orderBy(asc(foods.name))
        .all()
    : db.select().from(foods).orderBy(asc(foods.name)).all();
  return NextResponse.json({ foods: rows });
});

export const POST = withUser(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body?.name || !Number.isFinite(Number(body?.calories))) {
    return NextResponse.json(
      { error: "name and calories are required" },
      { status: 400 }
    );
  }
  const food = cacheFood({
    name: String(body.name),
    aliases: Array.isArray(body.aliases) ? body.aliases.map(String) : [],
    servingSize: Number(body.servingSize) || 1,
    servingUnit: String(body.servingUnit || "serving"),
    calories: Number(body.calories),
    protein: Number(body.protein) || 0,
    carbs: Number(body.carbs) || 0,
    fat: Number(body.fat) || 0,
    fiber: Number(body.fiber) || 0,
    sugar: Number(body.sugar) || 0,
    sodium: Number(body.sodium) || 0,
    source: "user",
  });
  return NextResponse.json({ food }, { status: 201 });
});

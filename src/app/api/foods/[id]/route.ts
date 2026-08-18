import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/db";
import { foods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeFoodName } from "@/lib/normalize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NUMERIC_FIELDS = [
  "servingSize",
  "calories",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
    updates.normalizedName = normalizeFoodName(body.name);
  }
  if (typeof body.servingUnit === "string" && body.servingUnit.trim()) {
    updates.servingUnit = body.servingUnit.trim();
  }
  for (const field of NUMERIC_FIELDS) {
    if (body[field] !== undefined) {
      const v = Number(body[field]);
      if (Number.isFinite(v) && v >= 0) updates[field] = v;
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await db
    .update(foods)
    .set(updates)
    .where(eq(foods.id, Number(id)))
    .returning()
    .get();
  if (!updated) {
    return NextResponse.json({ error: "Food not found" }, { status: 404 });
  }
  return NextResponse.json({ food: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const { id } = await params;
  const deleted = await db
    .delete(foods)
    .where(eq(foods.id, Number(id)))
    .returning()
    .get();
  if (!deleted) {
    return NextResponse.json({ error: "Food not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted });
}

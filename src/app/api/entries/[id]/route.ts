import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/db";
import { entries, foods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { servingsFor, macrosForServings } from "@/lib/units";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const { id } = await params;
  const deleted = await db
    .delete(entries)
    .where(eq(entries.id, Number(id)))
    .returning()
    .get();
  if (!deleted) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureDb();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const quantity = Number(body?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  const entry = await db
    .select()
    .from(entries)
    .where(eq(entries.id, Number(id)))
    .get();
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Recompute macros from the linked food when possible; otherwise scale
  const food = entry.foodId
    ? await db.select().from(foods).where(eq(foods.id, entry.foodId)).get()
    : undefined;

  let macros;
  if (food) {
    macros = macrosForServings(food, servingsFor(quantity, entry.unit, food));
  } else {
    const ratio = quantity / entry.quantity;
    const r = (v: number) => Math.round(v * ratio * 10) / 10;
    macros = {
      calories: Math.round(entry.calories * ratio),
      protein: r(entry.protein),
      carbs: r(entry.carbs),
      fat: r(entry.fat),
      fiber: r(entry.fiber),
      sugar: r(entry.sugar),
      sodium: Math.round(entry.sodium * ratio),
    };
  }

  const updated = await db
    .update(entries)
    .set({ quantity, ...macros })
    .where(eq(entries.id, Number(id)))
    .returning()
    .get();

  return NextResponse.json({ updated });
}

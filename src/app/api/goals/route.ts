import { NextRequest, NextResponse } from "next/server";
import { db, ensureDb } from "@/db";
import { goals } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await ensureDb();
  const row = await db.select().from(goals).where(eq(goals.id, 1)).get();
  return NextResponse.json({ goals: row });
}

export async function PUT(req: NextRequest) {
  await ensureDb();
  const body = await req.json().catch(() => null);
  const fields = ["calories", "protein", "carbs", "fat"] as const;
  const updates: Record<string, number> = {};
  for (const f of fields) {
    const v = Number(body?.[f]);
    if (Number.isFinite(v) && v > 0) updates[f] = v;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  const updated = await db
    .update(goals)
    .set(updates)
    .where(eq(goals.id, 1))
    .returning()
    .get();
  return NextResponse.json({ goals: updated });
}

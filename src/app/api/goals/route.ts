import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withUser } from "@/lib/auth";

export const GET = withUser(async (_req: NextRequest) => {
  const row = db.select().from(goals).where(eq(goals.id, 1)).get();
  return NextResponse.json({ goals: row });
});

export const PUT = withUser(async (req: NextRequest) => {
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
  const updated = db
    .update(goals)
    .set(updates)
    .where(eq(goals.id, 1))
    .returning()
    .get();
  return NextResponse.json({ goals: updated });
});

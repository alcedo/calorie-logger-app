import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/auth";
import { getAiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withUser(async (_req: NextRequest) => {
  const status = await getAiStatus();
  return NextResponse.json(status);
});

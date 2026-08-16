import { NextResponse } from "next/server";
import { getAiStatus } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = await getAiStatus();
  return NextResponse.json(status);
}

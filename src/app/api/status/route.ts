import { NextResponse } from "next/server";
import { getAiStatus } from "@/lib/ai";
import { withRequestCookies } from "@/lib/ai/request-cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = await withRequestCookies(() => getAiStatus());
  return NextResponse.json(status);
}

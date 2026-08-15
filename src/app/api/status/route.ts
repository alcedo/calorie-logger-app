import { NextResponse } from "next/server";
import { aiAvailable } from "@/lib/ai";

export async function GET() {
  return NextResponse.json({ aiAvailable: aiAvailable() });
}

import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const dest = new URL("/login", req.url);
  const res = NextResponse.redirect(dest);
  const expired = { path: "/", maxAge: 0 };
  res.cookies.set(sessionCookieName(), "", expired);
  res.cookies.set(`__Secure-${sessionCookieName()}`, "", expired);
  return res;
}

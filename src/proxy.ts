import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }
  const name = sessionCookieName();
  const token =
    request.cookies.get(name) ?? request.cookies.get(`__Secure-${name}`);
  if (!token?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

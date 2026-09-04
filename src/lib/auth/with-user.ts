import type { NextRequest } from "next/server";
import { runAsUser } from "@/lib/tenant";
import { requireUser, unauthorized } from "./session";

function withPrivateCache(res: Response): Response {
  const headers = new Headers(res.headers);
  const existing = headers.get("Cache-Control");
  if (!existing) {
    headers.set("Cache-Control", "private, no-store");
  } else if (!/private/i.test(existing)) {
    headers.set("Cache-Control", `${existing}, private`);
  }
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Cookie");
  } else if (!/\bCookie\b/i.test(vary)) {
    headers.set("Vary", `${vary}, Cookie`);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function withUser<C>(
  handler: (req: NextRequest, ctx: C) => Response | Promise<Response>,
): (req: NextRequest, ctx: C) => Promise<Response> {
  return async (req: NextRequest, ctx: C) => {
    const user = await requireUser(req);
    if (!user) return unauthorized();
    const res = await runAsUser(user, () => handler(req, ctx));
    return withPrivateCache(res);
  };
}

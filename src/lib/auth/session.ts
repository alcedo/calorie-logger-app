import { createHash } from "node:crypto";
import { encode, getToken } from "next-auth/jwt";

export interface AppUser {
  id: string;
  email: string;
  name: string;
}

export interface MintInput {
  email: string;
  name: string;
}

const COOKIE = "authjs.session-token";

export function sessionCookieName(): string {
  return COOKIE;
}

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }
  return secret;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function userIdFromEmail(email: string): string {
  return createHash("sha256")
    .update(normalizeEmail(email))
    .digest("hex")
    .slice(0, 32);
}

export function parseAppUser(token: {
  sub?: string | null;
  email?: string | null;
  name?: string | null;
} | null): AppUser | null {
  const email = token?.email?.trim();
  const name = token?.name?.trim();
  const sub = token?.sub?.trim();
  if (!email || !email.includes("@") || !name || !sub) return null;
  return { id: sub, email: normalizeEmail(email), name };
}

export function testMintEnabled(): boolean {
  return (
    process.env.AUTH_TEST_MINT === "1" && process.env.NODE_ENV !== "production"
  );
}

export async function mintTestSession(input: MintInput): Promise<string> {
  if (!testMintEnabled()) {
    throw new Error("Test session mint is disabled");
  }
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || "User";
  const id = userIdFromEmail(email);
  const jwt = await encode({
    secret: authSecret(),
    salt: COOKIE,
    token: { sub: id, email, name },
  });
  return `${COOKIE}=${jwt}`;
}

export async function requireUser(req: Request): Promise<AppUser | null> {
  const token = await getToken({
    req,
    secret: authSecret(),
    salt: COOKIE,
    cookieName: COOKIE,
    secureCookie: false,
  });
  return parseAppUser(token);
}

export function unauthorized(): Response {
  return Response.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    },
  );
}

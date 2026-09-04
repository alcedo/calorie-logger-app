import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  mintTestSession,
  parseAppUser,
  requireUser,
  sessionCookieName,
  testMintEnabled,
  userIdFromEmail,
} from "./session";

describe("session", () => {
  it("derives a stable id from a normalized email", () => {
    expect(userIdFromEmail("Ada@Example.com")).toBe(
      userIdFromEmail("ada@example.com"),
    );
    expect(userIdFromEmail("a@example.com")).not.toBe(
      userIdFromEmail("b@example.com"),
    );
    expect(userIdFromEmail("ada@example.com")).toHaveLength(32);
  });

  it("mints a cookie that requireUser accepts", async () => {
    expect(testMintEnabled()).toBe(true);
    const cookie = await mintTestSession({
      email: "Mint@Example.com",
      name: "Minter",
    });
    expect(cookie.startsWith(`${sessionCookieName()}=`)).toBe(true);
    const req = new NextRequest("http://localhost:3000/api/me", {
      headers: { cookie },
    });
    const user = await requireUser(req);
    expect(user).toEqual({
      id: userIdFromEmail("mint@example.com"),
      email: "mint@example.com",
      name: "Minter",
    });
  });

  it("rejects a request without a cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/me");
    expect(await requireUser(req)).toBeNull();
  });

  it("parseAppUser requires email, name, and sub", () => {
    expect(parseAppUser({ sub: "x", email: "a@b.c" })).toBeNull();
    expect(
      parseAppUser({ sub: "x", email: "a@b.c", name: "Ada" }),
    ).toEqual({ id: "x", email: "a@b.c", name: "Ada" });
  });
});

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { userIdFromEmail } from "@/lib/auth/session";
import { dataRoot } from "@/lib/tenant";
import { jsonRequest, readJson, setupTempDatabase } from "@/test/helpers";

setupTempDatabase();

const DATE = "2026-09-04";

type RouteMod = Record<
  string,
  (
    req: ReturnType<typeof jsonRequest>,
    ctx?: { params: Promise<{ id: string }> },
  ) => Promise<Response>
>;

async function statusOf(
  load: () => Promise<RouteMod>,
  method: string,
  url: string,
  body?: unknown,
  params?: { id: string },
): Promise<number> {
  const mod = await load();
  const handler = mod[method];
  if (!handler) throw new Error(`missing ${method} on ${url}`);
  const req = jsonRequest(method, url, body, { cookie: "" });
  const res = params
    ? await handler(req, { params: Promise.resolve(params) })
    : await handler(req);
  return res.status;
}

describe("unauthenticated data APIs", () => {
  it("returns 401 for log, entries, foods, goals, history, status, and ai", async () => {
    const cases: Array<Promise<number>> = [
      statusOf(() => import("@/app/api/log/route"), "POST", "/api/log", {
        text: "2 eggs",
        date: DATE,
      }),
      statusOf(
        () => import("@/app/api/entries/route"),
        "GET",
        `/api/entries?date=${DATE}`,
      ),
      statusOf(
        () => import("@/app/api/entries/[id]/route"),
        "PATCH",
        "/api/entries/1",
        { quantity: 2 },
        { id: "1" },
      ),
      statusOf(
        () => import("@/app/api/entries/[id]/route"),
        "DELETE",
        "/api/entries/1",
        undefined,
        { id: "1" },
      ),
      statusOf(() => import("@/app/api/foods/route"), "GET", "/api/foods"),
      statusOf(() => import("@/app/api/foods/route"), "POST", "/api/foods", {
        name: "X",
        calories: 1,
      }),
      statusOf(
        () => import("@/app/api/foods/[id]/route"),
        "PATCH",
        "/api/foods/1",
        { name: "Y" },
        { id: "1" },
      ),
      statusOf(
        () => import("@/app/api/foods/[id]/route"),
        "DELETE",
        "/api/foods/1",
        undefined,
        { id: "1" },
      ),
      statusOf(() => import("@/app/api/goals/route"), "GET", "/api/goals"),
      statusOf(() => import("@/app/api/goals/route"), "PUT", "/api/goals", {
        calories: 1800,
      }),
      statusOf(() => import("@/app/api/history/route"), "GET", "/api/history"),
      statusOf(() => import("@/app/api/status/route"), "GET", "/api/status"),
      statusOf(() => import("@/app/api/ai/route"), "POST", "/api/ai", {
        action: "preference",
        selection: "none",
      }),
      statusOf(() => import("@/app/api/me/route"), "GET", "/api/me"),
    ];

    const statuses = await Promise.all(cases);
    expect(statuses).toEqual(Array(cases.length).fill(401));
  });
});

describe("two users do not share logs", () => {
  it("keeps user B from seeing or mutating user A's entry", async () => {
    const { mintTestSession } = await import("@/lib/auth/session");
    const { POST: logPost } = await import("@/app/api/log/route");
    const { GET: entriesGet } = await import("@/app/api/entries/route");
    const { PATCH: entryPatch, DELETE: entryDelete } = await import(
      "@/app/api/entries/[id]/route"
    );

    const cookieA = await mintTestSession({
      email: "a@example.com",
      name: "User A",
    });
    const cookieB = await mintTestSession({
      email: "b@example.com",
      name: "User B",
    });

    const logged = await logPost(
      jsonRequest(
        "POST",
        "/api/log",
        { text: "2 eggs", date: DATE },
        { cookie: cookieA },
      ),
    );
    expect(logged.status).toBe(200);
    const loggedBody = await readJson<{
      logged: Array<{ id: number; foodName: string }>;
    }>(logged);
    expect(loggedBody.body.logged.length).toBeGreaterThan(0);
    const entryId = loggedBody.body.logged[0].id;

    const bDay = await entriesGet(
      jsonRequest("GET", `/api/entries?date=${DATE}`, undefined, {
        cookie: cookieB,
      }),
    );
    const bBody = await readJson<{ entries: Array<{ id: number }> }>(bDay);
    expect(bDay.status).toBe(200);
    expect(bBody.body.entries.map((e) => e.id)).not.toContain(entryId);

    const patched = await entryPatch(
      jsonRequest(
        "PATCH",
        `/api/entries/${entryId}`,
        { quantity: 9 },
        { cookie: cookieB },
      ),
      { params: Promise.resolve({ id: String(entryId) }) },
    );
    expect(patched.status).toBe(404);

    const deleted = await entryDelete(
      jsonRequest(
        "DELETE",
        `/api/entries/${entryId}`,
        undefined,
        { cookie: cookieB },
      ),
      { params: Promise.resolve({ id: String(entryId) }) },
    );
    expect(deleted.status).toBe(404);

    const aDay = await entriesGet(
      jsonRequest("GET", `/api/entries?date=${DATE}`, undefined, {
        cookie: cookieA,
      }),
    );
    const aBody = await readJson<{ entries: Array<{ id: number }> }>(aDay);
    expect(aBody.body.entries.map((e) => e.id)).toContain(entryId);

    const aDb = path.join(dataRoot(), userIdFromEmail("a@example.com"), "app.db");
    const bDb = path.join(dataRoot(), userIdFromEmail("b@example.com"), "app.db");
    expect(aDb).not.toBe(bDb);
    expect(fs.existsSync(aDb)).toBe(true);
    expect(fs.existsSync(bDb)).toBe(true);
  });
});

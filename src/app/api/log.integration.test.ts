import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, foods } from "@/db/schema";
import { findFood, cacheFood } from "@/lib/food-lookup";
import { jsonRequest, readJson, setupTempDatabase } from "@/test/helpers";

setupTempDatabase();

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  vi.doUnmock("@/lib/ai");
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/lib/ai");
  delete process.env.OPENAI_API_KEY;
});

describe("findFood / cacheFood", () => {
  it("matches exact normalized names", () => {
    const food = findFood("Eggs");
    expect(food?.name).toBe("Egg");
  });

  it("matches aliases", () => {
    const food = findFood("large egg");
    expect(food?.name).toBe("Egg");
  });

  it("fuzzy-matches when query tokens are contained", () => {
    const food = findFood("grilled chicken breast");
    expect(food?.name).toBe("Chicken Breast");
  });

  it("does not collapse long queries into short substring foods", () => {
    // "dragonfruit smoothie bowl" must not match lone "Smoothie"
    expect(findFood("dragonfruit smoothie bowl")).toBeUndefined();
  });

  it("returns undefined for empty query", () => {
    expect(findFood("   ")).toBeUndefined();
  });

  it("cacheFood inserts a new food and dedupes by normalized name", () => {
    const first = cacheFood({
      name: "Dragon Fruit",
      aliases: ["pitaya"],
      servingSize: 1,
      servingUnit: "medium",
      calories: 120,
      protein: 2,
      carbs: 26,
      fat: 0.5,
      source: "user",
    });
    expect(first.name).toBe("Dragon Fruit");
    expect(first.source).toBe("user");

    const second = cacheFood({
      name: "dragon fruit",
      servingSize: 1,
      servingUnit: "serving",
      calories: 999,
      protein: 0,
      carbs: 0,
      fat: 0,
      source: "ai",
    });
    expect(second.id).toBe(first.id);
    expect(second.calories).toBe(120);
  });
});

describe("POST /api/log", () => {
  it("returns 400 when text is missing", async () => {
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(jsonRequest("POST", "/api/log", {}));
    const { status, body } = await readJson<{ error: string }>(res);
    expect(status).toBe(400);
    expect(body.error).toMatch(/No text provided/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const { POST } = await import("@/app/api/log/route");
    const req = new (await import("next/server")).NextRequest(
      "http://localhost:3000/api/log",
      { method: "POST", body: "not-json", headers: { "Content-Type": "application/json" } }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 422 when nothing can be parsed", async () => {
    const { POST } = await import("@/app/api/log/route");
    // Separators alone yield no segments for the fallback parser
    const res = await POST(
      jsonRequest("POST", "/api/log", { text: "and , with" })
    );
    const { status, body } = await readJson<{ error: string }>(res);
    expect(status).toBe(422);
    expect(body.error).toMatch(/Could not find any foods/i);
  });

  it("logs the smoke meal without AI", async () => {
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest("POST", "/api/log", {
        text: "2 eggs and 200g chicken breast",
        date: "2026-08-15",
      })
    );
    const { status, body } = await readJson<{
      logged: Array<{ foodName: string; quantity: number; calories: number }>;
      unresolved: unknown[];
      usedAiParser: boolean;
      trace: Array<{ type: string; text?: string }>;
    }>(res);

    expect(status).toBe(200);
    expect(body.usedAiParser).toBe(false);
    expect(body.unresolved).toEqual([]);
    expect(body.logged).toHaveLength(2);
    expect(body.trace.some((e) => e.type === "step")).toBe(true);
    expect(
      body.trace.some(
        (e) => e.type === "thought" && !!e.text && /built-in parser/i.test(e.text),
      ),
    ).toBe(true);

    const egg = body.logged.find((e) => e.foodName === "Egg");
    const chicken = body.logged.find((e) => e.foodName === "Chicken Breast");
    expect(egg?.quantity).toBe(2);
    expect(egg?.calories).toBe(144); // 72 * 2
    expect(chicken?.quantity).toBe(200);
    expect(chicken?.calories).toBe(330); // 165 * 2
  });

  it("streams thought-process events when stream=1", async () => {
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest(
        "POST",
        "/api/log?stream=1",
        { text: "1 egg", date: "2026-08-15" },
        { Accept: "text/event-stream" },
      ),
    );
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toMatch(/data: /);
    expect(text).toMatch(/Reading your meal/);
    expect(text).toMatch(/"type":"done"/);
    expect(text).toMatch(/Egg/);
  });

  it("stores entries on the explicit date", async () => {
    const { POST } = await import("@/app/api/log/route");
    await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: "2026-01-02",
      })
    );
    const rows = db
      .select()
      .from(entries)
      .where(eq(entries.date, "2026-01-02"))
      .all();
    expect(rows).toHaveLength(1);
  });

  it("falls back to UTC today when date is invalid", async () => {
    const utcToday = new Date().toISOString().slice(0, 10);
    const { POST } = await import("@/app/api/log/route");
    await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: "not-a-date",
      })
    );
    const rows = db
      .select()
      .from(entries)
      .where(eq(entries.date, utcToday))
      .all();
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("puts unknown foods in unresolved when AI is off", async () => {
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg and 1 xyzzyplugh",
        date: "2026-08-15",
      })
    );
    const { body } = await readJson<{
      logged: Array<{ foodName: string }>;
      unresolved: Array<{ name: string; reason: string }>;
    }>(res);
    expect(body.logged.some((e) => e.foodName === "Egg")).toBe(true);
    expect(body.unresolved.length).toBeGreaterThanOrEqual(1);
    expect(body.unresolved[0].reason).toMatch(/AI is not configured/i);
  });
});

describe("POST /api/log with mocked AI", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/ai");
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.doUnmock("@/lib/ai");
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
  });

  it("sets usedAiParser when parseMealText succeeds", async () => {
    vi.doMock("@/lib/ai", () => ({
      getAiStatus: vi.fn().mockResolvedValue({
        aiAvailable: true,
        provider: "claude",
        bannerMessage: null,
      }),
      parseMealText: vi.fn().mockResolvedValue([
        { name: "egg", quantity: 1, unit: "serving" },
      ]),
      lookupNutrition: vi.fn(),
      AiUnavailableError: class extends Error {},
    }));
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest("POST", "/api/log", {
        text: "an egg",
        date: "2026-08-15",
      })
    );
    const { body } = await readJson<{ usedAiParser: boolean; logged: unknown[] }>(
      res
    );
    expect(body.usedAiParser).toBe(true);
    expect(body.logged).toHaveLength(1);
  });

  it("falls back to fallbackParse when AI parse throws", async () => {
    vi.doMock("@/lib/ai", () => ({
      getAiStatus: vi.fn().mockResolvedValue({
        aiAvailable: true,
        provider: "claude",
        bannerMessage: null,
      }),
      parseMealText: vi.fn().mockRejectedValue(new Error("boom")),
      lookupNutrition: vi.fn(),
      AiUnavailableError: class extends Error {},
    }));
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest("POST", "/api/log", {
        text: "2 eggs",
        date: "2026-08-15",
      })
    );
    const { body } = await readJson<{
      usedAiParser: boolean;
      logged: Array<{ foodName: string }>;
    }>(res);
    expect(body.usedAiParser).toBe(false);
    expect(body.logged[0]?.foodName).toBe("Egg");
  });

  it("caches AI nutrition for unknown foods", async () => {
    vi.doMock("@/lib/ai", () => ({
      getAiStatus: vi.fn().mockResolvedValue({
        aiAvailable: true,
        provider: "claude",
        bannerMessage: null,
      }),
      parseMealText: vi.fn().mockResolvedValue([
        { name: "dragon fruit", quantity: 1, unit: "serving" },
      ]),
      lookupNutrition: vi.fn().mockResolvedValue(
        new Map([
          [
            "dragon fruit",
            {
              name: "Dragon Fruit",
              aliases: ["pitaya"],
              servingSize: 1,
              servingUnit: "medium",
              calories: 120,
              protein: 2,
              carbs: 26,
              fat: 0.5,
              fiber: 5,
              sugar: 18,
              sodium: 2,
            },
          ],
        ])
      ),
      AiUnavailableError: class extends Error {},
    }));
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest("POST", "/api/log", {
        text: "dragon fruit",
        date: "2026-08-15",
      })
    );
    const { body } = await readJson<{
      logged: Array<{ foodName: string; calories: number; foodSource?: string }>;
      unresolved: unknown[];
      trace: Array<{ type: string; title?: string }>;
    }>(res);
    expect(body.unresolved).toEqual([]);
    expect(body.logged[0]?.foodName).toBe("Dragon Fruit");
    expect(body.logged[0]?.calories).toBe(120);
    expect(
      body.trace.some((e) => e.title && /searching the web/i.test(e.title)),
    ).toBe(true);
    expect(
      db.select().from(foods).where(eq(foods.normalizedName, "dragon fruit")).get()
        ?.source
    ).toBe("ai");
  });

  it("partially succeeds when nutrition lookup fails for one item", async () => {
    vi.doMock("@/lib/ai", () => ({
      getAiStatus: vi.fn().mockResolvedValue({
        aiAvailable: true,
        provider: "claude",
        bannerMessage: null,
      }),
      parseMealText: vi.fn().mockResolvedValue([
        { name: "egg", quantity: 1, unit: "serving" },
        { name: "mystery goo", quantity: 1, unit: "serving" },
      ]),
      lookupNutrition: vi.fn().mockRejectedValue(new Error("fail")),
      AiUnavailableError: class extends Error {},
    }));
    const { POST } = await import("@/app/api/log/route");
    const res = await POST(
      jsonRequest("POST", "/api/log", {
        text: "egg and mystery",
        date: "2026-08-15",
      })
    );
    const { body } = await readJson<{
      logged: Array<{ foodName: string }>;
      unresolved: Array<{ name: string }>;
    }>(res);
    expect(body.logged.some((e) => e.foodName === "Egg")).toBe(true);
    expect(body.unresolved.some((u) => u.name === "mystery goo")).toBe(true);
  });
});

describe("GET /api/entries and entry mutations", () => {
  it("defaults to UTC today when date is omitted", async () => {
    const utcToday = new Date().toISOString().slice(0, 10);
    const { POST } = await import("@/app/api/log/route");
    await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: utcToday,
      })
    );
    const { GET } = await import("@/app/api/entries/route");
    const res = await GET(jsonRequest("GET", "/api/entries"));
    const { body } = await readJson<{ date: string; entries: unknown[] }>(res);
    expect(body.date).toBe(utcToday);
    expect(body.entries.length).toBeGreaterThanOrEqual(1);
  });

  it("returns entries, totals, and goals for a date", async () => {
    const { POST } = await import("@/app/api/log/route");
    await POST(
      jsonRequest("POST", "/api/log", {
        text: "2 eggs",
        date: "2026-08-15",
      })
    );
    const { GET } = await import("@/app/api/entries/route");
    const res = await GET(
      jsonRequest("GET", "/api/entries?date=2026-08-15")
    );
    const { body } = await readJson<{
      date: string;
      entries: Array<{ foodName: string }>;
      totals: { calories: number; protein: number };
      goals: { calories: number };
    }>(res);
    expect(body.date).toBe("2026-08-15");
    expect(body.entries).toHaveLength(1);
    expect(body.totals.calories).toBe(144);
    expect(body.goals.calories).toBe(2000);
  });

  it("PATCH recomputes macros when foodId is linked", async () => {
    const { POST } = await import("@/app/api/log/route");
    const logRes = await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: "2026-08-15",
      })
    );
    const { body: logBody } = await readJson<{
      logged: Array<{ id: number }>;
    }>(logRes);
    const id = logBody.logged[0].id;

    const { PATCH } = await import("@/app/api/entries/[id]/route");
    const res = await PATCH(jsonRequest("PATCH", `/api/entries/${id}`, { quantity: 3 }), {
      params: Promise.resolve({ id: String(id) }),
    });
    const { body } = await readJson<{
      updated: { quantity: number; calories: number };
    }>(res);
    expect(body.updated.quantity).toBe(3);
    expect(body.updated.calories).toBe(216);
  });

  it("PATCH scales macros for orphaned entries", async () => {
    const { POST: postLog } = await import("@/app/api/log/route");
    const logRes = await postLog(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: "2026-08-15",
      })
    );
    const { body: logBody } = await readJson<{
      logged: Array<{ id: number; foodId: number }>;
    }>(logRes);
    const entryId = logBody.logged[0].id;
    const foodId = logBody.logged[0].foodId;

    // Create a disposable food + entry path: orphan via SET NULL
    // Deleting seed Egg would break other tests in same DB — insert custom food instead
    const custom = cacheFood({
      name: "Temp Food",
      servingSize: 1,
      servingUnit: "serving",
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 5,
      source: "user",
    });
    const inserted = db
      .insert(entries)
      .values({
        date: "2026-08-15",
        foodId: custom.id,
        foodName: custom.name,
        quantity: 2,
        unit: "serving",
        calories: 200,
        protein: 20,
        carbs: 20,
        fat: 10,
      })
      .returning()
      .get();

    db.delete(foods).where(eq(foods.id, custom.id)).run();
    const orphan = db
      .select()
      .from(entries)
      .where(eq(entries.id, inserted.id))
      .get();
    expect(orphan?.foodId).toBeNull();

    const { PATCH } = await import("@/app/api/entries/[id]/route");
    const res = await PATCH(
      jsonRequest("PATCH", `/api/entries/${inserted.id}`, { quantity: 1 }),
      { params: Promise.resolve({ id: String(inserted.id) }) }
    );
    const { body } = await readJson<{
      updated: { calories: number; protein: number; quantity: number };
    }>(res);
    expect(body.updated.quantity).toBe(1);
    expect(body.updated.calories).toBe(100);
    expect(body.updated.protein).toBe(10);

    // silence unused
    expect(entryId).toBeTruthy();
    expect(foodId).toBeTruthy();
  });

  it("PATCH returns 400 for invalid quantity", async () => {
    const { PATCH } = await import("@/app/api/entries/[id]/route");
    const res = await PATCH(
      jsonRequest("PATCH", "/api/entries/1", { quantity: 0 }),
      { params: Promise.resolve({ id: "1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("PATCH returns 404 for missing entry", async () => {
    const { PATCH } = await import("@/app/api/entries/[id]/route");
    const res = await PATCH(
      jsonRequest("PATCH", "/api/entries/999999", { quantity: 2 }),
      { params: Promise.resolve({ id: "999999" }) }
    );
    expect(res.status).toBe(404);
  });

  it("DELETE removes an entry and 404s when missing", async () => {
    const { POST } = await import("@/app/api/log/route");
    const logRes = await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: "2026-08-15",
      })
    );
    const { body: logBody } = await readJson<{
      logged: Array<{ id: number }>;
    }>(logRes);
    const id = logBody.logged[0].id;

    const { DELETE } = await import("@/app/api/entries/[id]/route");
    const del = await DELETE(jsonRequest("DELETE", `/api/entries/${id}`), {
      params: Promise.resolve({ id: String(id) }),
    });
    expect(del.status).toBe(200);

    const missing = await DELETE(jsonRequest("DELETE", `/api/entries/${id}`), {
      params: Promise.resolve({ id: String(id) }),
    });
    expect(missing.status).toBe(404);
  });
});

import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, foods } from "@/db/schema";
import { cacheFood } from "@/lib/food-lookup";
import { jsonRequest, readJson, setupTempDatabase } from "@/test/helpers";

setupTempDatabase();

describe("foods API", () => {
  it("GET returns seeded foods ordered by name", async () => {
    const { GET } = await import("@/app/api/foods/route");
    const res = await GET(jsonRequest("GET", "/api/foods"));
    const { body } = await readJson<{ foods: Array<{ name: string }> }>(res);
    expect(body.foods.length).toBeGreaterThanOrEqual(100);
    const names = body.foods.map((f) => f.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("GET ?q= filters by normalized name", async () => {
    const { GET } = await import("@/app/api/foods/route");
    const res = await GET(jsonRequest("GET", "/api/foods?q=chicken"));
    const { body } = await readJson<{ foods: Array<{ name: string }> }>(res);
    expect(body.foods.length).toBeGreaterThan(0);
    expect(
      body.foods.every((f) => f.name.toLowerCase().includes("chicken"))
    ).toBe(true);
  });

  it("POST creates a user food and rejects bad payloads", async () => {
    const { POST } = await import("@/app/api/foods/route");
    const bad = await POST(jsonRequest("POST", "/api/foods", { name: "X" }));
    expect(bad.status).toBe(400);

    const ok = await POST(
      jsonRequest("POST", "/api/foods", {
        name: "Custom Bar",
        calories: 200,
        protein: 10,
      })
    );
    const { status, body } = await readJson<{
      food: { name: string; source: string; servingUnit: string };
    }>(ok);
    expect(status).toBe(201);
    expect(body.food.name).toBe("Custom Bar");
    expect(body.food.source).toBe("user");
    expect(body.food.servingUnit).toBe("serving");
  });

  it("PATCH updates name/normalizedName and validates numerics", async () => {
    const food = cacheFood({
      name: "Edit Me",
      servingSize: 1,
      servingUnit: "serving",
      calories: 50,
      protein: 1,
      carbs: 1,
      fat: 1,
      source: "user",
    });
    const { PATCH } = await import("@/app/api/foods/[id]/route");

    const empty = await PATCH(
      jsonRequest("PATCH", `/api/foods/${food.id}`, {}),
      { params: Promise.resolve({ id: String(food.id) }) }
    );
    expect(empty.status).toBe(400);

    const updated = await PATCH(
      jsonRequest("PATCH", `/api/foods/${food.id}`, {
        name: "Edited Food",
        calories: 80,
      }),
      { params: Promise.resolve({ id: String(food.id) }) }
    );
    const { body } = await readJson<{
      food: { name: string; normalizedName: string; calories: number };
    }>(updated);
    expect(body.food.name).toBe("Edited Food");
    expect(body.food.normalizedName).toBe("edited food");
    expect(body.food.calories).toBe(80);
  });

  it("DELETE removes food and orphans entries", async () => {
    const food = cacheFood({
      name: "Delete Me",
      servingSize: 1,
      servingUnit: "serving",
      calories: 50,
      protein: 1,
      carbs: 1,
      fat: 1,
      source: "user",
    });
    const entry = db
      .insert(entries)
      .values({
        date: "2026-08-15",
        foodId: food.id,
        foodName: food.name,
        quantity: 1,
        unit: "serving",
        calories: 50,
        protein: 1,
        carbs: 1,
        fat: 1,
      })
      .returning()
      .get();

    const { DELETE } = await import("@/app/api/foods/[id]/route");
    const res = await DELETE(jsonRequest("DELETE", `/api/foods/${food.id}`), {
      params: Promise.resolve({ id: String(food.id) }),
    });
    expect(res.status).toBe(200);
    expect(
      db.select().from(foods).where(eq(foods.id, food.id)).get()
    ).toBeUndefined();
    const orphan = db
      .select()
      .from(entries)
      .where(eq(entries.id, entry.id))
      .get();
    expect(orphan?.foodId).toBeNull();
    expect(orphan?.foodName).toBe("Delete Me");
  });

  it("DELETE returns 404 for missing food", async () => {
    const { DELETE } = await import("@/app/api/foods/[id]/route");
    const res = await DELETE(jsonRequest("DELETE", "/api/foods/999999"), {
      params: Promise.resolve({ id: "999999" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("goals API", () => {
  it("GET returns default goals", async () => {
    const { GET } = await import("@/app/api/goals/route");
    const res = await GET();
    const { body } = await readJson<{
      goals: { calories: number; protein: number };
    }>(res);
    expect(body.goals.calories).toBe(2000);
    expect(body.goals.protein).toBe(120);
  });

  it("PUT updates finite positive fields only", async () => {
    const { PUT } = await import("@/app/api/goals/route");
    const bad = await PUT(jsonRequest("PUT", "/api/goals", { calories: -1 }));
    expect(bad.status).toBe(400);

    const ok = await PUT(
      jsonRequest("PUT", "/api/goals", { calories: 1800, protein: 150 })
    );
    const { body } = await readJson<{
      goals: { calories: number; protein: number; carbs: number };
    }>(ok);
    expect(body.goals.calories).toBe(1800);
    expect(body.goals.protein).toBe(150);
    expect(body.goals.carbs).toBe(225);
  });
});

describe("history and status APIs", () => {
  it("aggregates history and clamps days", async () => {
    const { POST } = await import("@/app/api/log/route");
    await POST(
      jsonRequest("POST", "/api/log", {
        text: "1 egg",
        date: "2026-08-15",
      })
    );

    const { GET } = await import("@/app/api/history/route");
    const res = await GET(jsonRequest("GET", "/api/history?days=60"));
    const { body } = await readJson<{
      days: Array<{ date: string; entryCount: number; calories: number }>;
    }>(res);
    const day = body.days.find((d) => d.date === "2026-08-15");
    expect(day?.entryCount).toBe(1);
    expect(day?.calories).toBe(72);

    const high = await GET(jsonRequest("GET", "/api/history?days=9999"));
    expect(high.status).toBe(200);

    // days=0 clamps to 1 (still a successful response)
    const low = await GET(jsonRequest("GET", "/api/history?days=0"));
    expect(low.status).toBe(200);
  });

  it("returns empty days when nothing is in range", async () => {
    const { GET } = await import("@/app/api/history/route");
    const res = await GET(jsonRequest("GET", "/api/history?days=1"));
    const { body } = await readJson<{ days: unknown[] }>(res);
    // no entries in beforeEach-cleared DB
    expect(body.days).toEqual([]);
  });

  it("status reflects AI availability", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
    const { clearAiStatusCache } = await import("@/lib/ai");
    clearAiStatusCache();

    const { GET } = await import("@/app/api/status/route");
    const off = await readJson<{ aiAvailable: boolean }>(await GET());
    expect(off.body.aiAvailable).toBe(false);

    process.env.OPENAI_API_KEY = "x";
    clearAiStatusCache();
    const keyOnly = await readJson<{ aiAvailable: boolean }>(await GET());
    expect(keyOnly.body.aiAvailable).toBe(false);

    process.env.AI_PROVIDER = "openai";
    clearAiStatusCache();
    const on = await readJson<{ aiAvailable: boolean }>(await GET());
    expect(on.body.aiAvailable).toBe(true);

    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    clearAiStatusCache();
  });

  it("saves provider and model preference", async () => {
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.AI_PROVIDER;
    const { clearAiStatusCache } = await import("@/lib/ai");
    const { POST } = await import("@/app/api/ai/route");
    const res = await POST(
      jsonRequest("POST", "/api/ai", {
        action: "preference",
        selection: "none",
        models: { claude: "haiku" },
      }),
    );
    const { status, body } = await readJson<{
      status: { selection: string; models: { claude: string } };
    }>(res);
    expect(status).toBe(200);
    expect(body.status.selection).toBe("none");
    expect(body.status.models.claude).toBe("haiku");
    if (originalProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalProvider;
    clearAiStatusCache();
  });

  it("connect Codex without a CLI returns a readable error, not spawn ENOENT", async () => {
    const originalBin = process.env.AI_CODEX_BIN;
    const originalWait = process.env.AI_LOGIN_START_WAIT_MS;
    process.env.AI_CODEX_BIN = "/no/such/macro-codex-binary";
    process.env.AI_LOGIN_START_WAIT_MS = "2000";
    const { POST } = await import("@/app/api/ai/route");
    const res = await POST(
      jsonRequest("POST", "/api/ai", { action: "connect", provider: "codex" }),
    );
    const { status, body } = await readJson<{ error: string }>(res);
    expect(status).toBe(400);
    expect(body.error).toMatch(/codex CLI not found/i);
    expect(body.error).not.toMatch(/spawn /i);
    expect(body.error).not.toMatch(/ENOENT/);
    if (originalBin === undefined) delete process.env.AI_CODEX_BIN;
    else process.env.AI_CODEX_BIN = originalBin;
    if (originalWait === undefined) delete process.env.AI_LOGIN_START_WAIT_MS;
    else process.env.AI_LOGIN_START_WAIT_MS = originalWait;
  });

  it("connect Claude without a CLI returns a readable error, not spawn ENOENT", async () => {
    const originalBin = process.env.AI_CLAUDE_BIN;
    const originalWait = process.env.AI_LOGIN_START_WAIT_MS;
    process.env.AI_CLAUDE_BIN = "/no/such/macro-claude-binary";
    process.env.AI_LOGIN_START_WAIT_MS = "2000";
    const { POST } = await import("@/app/api/ai/route");
    const res = await POST(
      jsonRequest("POST", "/api/ai", { action: "connect", provider: "claude" }),
    );
    const { status, body } = await readJson<{ error: string }>(res);
    expect(status).toBe(400);
    expect(body.error).toMatch(/claude CLI not found/i);
    expect(body.error).not.toMatch(/spawn /i);
    expect(body.error).not.toMatch(/ENOENT/);
    if (originalBin === undefined) delete process.env.AI_CLAUDE_BIN;
    else process.env.AI_CLAUDE_BIN = originalBin;
    if (originalWait === undefined) delete process.env.AI_LOGIN_START_WAIT_MS;
    else process.env.AI_LOGIN_START_WAIT_MS = originalWait;
  });
});

describe("multi-step flows", () => {
  it("log → edit → delete → history updates", async () => {
    const { POST } = await import("@/app/api/log/route");
    const logRes = await POST(
      jsonRequest("POST", "/api/log", {
        text: "2 eggs",
        date: "2026-08-10",
      })
    );
    const { body: logBody } = await readJson<{
      logged: Array<{ id: number }>;
    }>(logRes);
    const id = logBody.logged[0].id;

    const { PATCH, DELETE } = await import("@/app/api/entries/[id]/route");
    await PATCH(jsonRequest("PATCH", `/api/entries/${id}`, { quantity: 1 }), {
      params: Promise.resolve({ id: String(id) }),
    });

    const { GET: getEntries } = await import("@/app/api/entries/route");
    const mid = await readJson<{ totals: { calories: number } }>(
      await getEntries(jsonRequest("GET", "/api/entries?date=2026-08-10"))
    );
    expect(mid.body.totals.calories).toBe(72);

    await DELETE(jsonRequest("DELETE", `/api/entries/${id}`), {
      params: Promise.resolve({ id: String(id) }),
    });

    const { GET: getHistory } = await import("@/app/api/history/route");
    const hist = await readJson<{ days: Array<{ date: string }> }>(
      await getHistory(jsonRequest("GET", "/api/history?days=30"))
    );
    expect(hist.body.days.find((d) => d.date === "2026-08-10")).toBeUndefined();
  });

  it("updated goals appear on entries response", async () => {
    const { PUT } = await import("@/app/api/goals/route");
    await PUT(jsonRequest("PUT", "/api/goals", { calories: 2200 }));

    const { GET } = await import("@/app/api/entries/route");
    const res = await GET(
      jsonRequest("GET", "/api/entries?date=2026-08-15")
    );
    const { body } = await readJson<{ goals: { calories: number } }>(res);
    expect(body.goals.calories).toBe(2200);
  });

  it("food CRUD affects lookup and orphans entries", async () => {
    delete process.env.OPENAI_API_KEY;
    const { POST: postFood } = await import("@/app/api/foods/route");
    const created = await readJson<{ food: { id: number; name: string } }>(
      await postFood(
        jsonRequest("POST", "/api/foods", {
          name: "Flow Snack",
          calories: 100,
          protein: 5,
          carbs: 10,
          fat: 4,
        })
      )
    );
    expect(created.status).toBe(201);

    const { POST: postLog } = await import("@/app/api/log/route");
    const logged = await readJson<{
      logged: Array<{ id: number; foodId: number; calories: number }>;
    }>(
      await postLog(
        jsonRequest("POST", "/api/log", {
          text: "1 flow snack",
          date: "2026-08-12",
        })
      )
    );
    expect(logged.body.logged).toHaveLength(1);
    const entryId = logged.body.logged[0].id;

    const { PATCH: patchFood, DELETE: deleteFood } = await import(
      "@/app/api/foods/[id]/route"
    );
    await patchFood(
      jsonRequest("PATCH", `/api/foods/${created.body.food.id}`, {
        calories: 200,
      }),
      { params: Promise.resolve({ id: String(created.body.food.id) }) }
    );

    const { PATCH: patchEntry } = await import("@/app/api/entries/[id]/route");
    const updated = await readJson<{ updated: { calories: number } }>(
      await patchEntry(
        jsonRequest("PATCH", `/api/entries/${entryId}`, { quantity: 1 }),
        { params: Promise.resolve({ id: String(entryId) }) }
      )
    );
    expect(updated.body.updated.calories).toBe(200);

    await deleteFood(
      jsonRequest("DELETE", `/api/foods/${created.body.food.id}`),
      { params: Promise.resolve({ id: String(created.body.food.id) }) }
    );
    const orphan = db
      .select()
      .from(entries)
      .where(eq(entries.id, entryId))
      .get();
    expect(orphan?.foodId).toBeNull();

    const again = await readJson<{
      logged: unknown[];
      unresolved: Array<{ name: string }>;
    }>(
      await postLog(
        jsonRequest("POST", "/api/log", {
          text: "1 flow snack",
          date: "2026-08-12",
        })
      )
    );
    expect(again.body.logged).toHaveLength(0);
    expect(again.body.unresolved.length).toBeGreaterThanOrEqual(1);
  });
});

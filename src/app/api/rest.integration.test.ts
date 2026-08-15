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

    const clamped = await GET(jsonRequest("GET", "/api/history?days=9999"));
    expect(clamped.status).toBe(200);
  });

  it("status reflects AI availability", async () => {
    delete process.env.OPENAI_API_KEY;
    const { GET } = await import("@/app/api/status/route");
    const off = await readJson<{ aiAvailable: boolean }>(await GET());
    expect(off.body.aiAvailable).toBe(false);

    process.env.OPENAI_API_KEY = "x";
    const on = await readJson<{ aiAvailable: boolean }>(await GET());
    expect(on.body.aiAvailable).toBe(true);
    delete process.env.OPENAI_API_KEY;
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
});

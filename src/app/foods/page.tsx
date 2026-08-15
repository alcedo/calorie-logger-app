"use client";

import { useCallback, useEffect, useState } from "react";
import type { FoodDto, GoalsDto } from "@/lib/types";

const SOURCE_BADGE: Record<FoodDto["source"], { label: string; cls: string }> =
  {
    seed: { label: "built-in", cls: "bg-zinc-800 text-zinc-400" },
    ai: { label: "AI", cls: "bg-sky-500/15 text-sky-300" },
    user: { label: "custom", cls: "bg-emerald-500/15 text-emerald-300" },
  };

function GoalsEditor() {
  const [goals, setGoals] = useState<GoalsDto | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals));
  }, []);

  async function save() {
    if (!goals) return;
    await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goals),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!goals) return null;

  const fields = [
    { key: "calories", label: "Calories (kcal)" },
    { key: "protein", label: "Protein (g)" },
    { key: "carbs", label: "Carbs (g)" },
    { key: "fat", label: "Fat (g)" },
  ] as const;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-300">Daily goals</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(({ key, label }) => (
          <label key={key} className="text-xs text-zinc-400">
            {label}
            <input
              type="number"
              min={1}
              value={goals[key]}
              onChange={(e) =>
                setGoals({ ...goals, [key]: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </label>
        ))}
      </div>
      <button
        onClick={save}
        className="mt-4 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
      >
        {saved ? "Saved ✓" : "Save goals"}
      </button>
    </section>
  );
}

export default function FoodsPage() {
  const [foodList, setFoodList] = useState<FoodDto[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<FoodDto | null>(null);

  const load = useCallback(async (q: string) => {
    const res = await fetch(`/api/foods${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setFoodList(data.foods);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 200);
    return () => clearTimeout(t);
  }, [query, load]);

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/foods/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    load(query);
  }

  async function remove(id: number) {
    await fetch(`/api/foods/${id}`, { method: "DELETE" });
    load(query);
  }

  const numericFields = [
    { key: "servingSize", label: "Serving size" },
    { key: "calories", label: "Calories" },
    { key: "protein", label: "Protein (g)" },
    { key: "carbs", label: "Carbs (g)" },
    { key: "fat", label: "Fat (g)" },
    { key: "fiber", label: "Fiber (g)" },
    { key: "sugar", label: "Sugar (g)" },
    { key: "sodium", label: "Sodium (mg)" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <GoalsEditor />

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Food database{" "}
            <span className="font-normal text-zinc-500">
              ({foodList.length})
            </span>
          </h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods…"
            className="w-44 rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-sm outline-none focus:border-emerald-500 sm:w-60"
          />
        </div>

        <ul className="divide-y divide-zinc-800/80">
          {foodList.map((f) => (
            <li key={f.id} className="py-3">
              {editing?.id === f.id ? (
                <div className="rounded-xl bg-zinc-900 p-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label className="col-span-2 text-xs text-zinc-400">
                      Name
                      <input
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                      />
                    </label>
                    <label className="col-span-2 text-xs text-zinc-400">
                      Serving unit
                      <input
                        value={editing.servingUnit}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            servingUnit: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                      />
                    </label>
                    {numericFields.map(({ key, label }) => (
                      <label key={key} className="text-xs text-zinc-400">
                        {label}
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={editing[key]}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              [key]: Number(e.target.value),
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-full bg-zinc-800 px-4 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {f.name}
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${SOURCE_BADGE[f.source].cls}`}
                      >
                        {SOURCE_BADGE[f.source].label}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {f.servingSize} {f.servingUnit} · {Math.round(f.calories)}{" "}
                      kcal · P {f.protein}g · C {f.carbs}g · F {f.fat}g
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing(f)}
                    className="shrink-0 rounded-full px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    className="shrink-0 rounded-full px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
          {foodList.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              No foods match &quot;{query}&quot;.
            </p>
          )}
        </ul>
      </section>
    </div>
  );
}

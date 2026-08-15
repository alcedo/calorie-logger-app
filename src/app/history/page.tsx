"use client";

import { useEffect, useState } from "react";
import { EntryList } from "@/components/EntryList";
import type { EntryDto, GoalsDto } from "@/lib/types";

interface DaySummary {
  date: string;
  entryCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [goals, setGoals] = useState<GoalsDto | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<Record<string, EntryDto[]>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [historyRes, goalsRes] = await Promise.all([
      fetch("/api/history?days=60"),
      fetch("/api/goals"),
    ]);
    const history = await historyRes.json();
    const g = await goalsRes.json();
    setDays(history.days);
    setGoals(g.goals);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleDay(date: string) {
    if (expanded === date) {
      setExpanded(null);
      return;
    }
    setExpanded(date);
    if (!dayEntries[date]) {
      const res = await fetch(`/api/entries?date=${date}`);
      const data = await res.json();
      setDayEntries((prev) => ({ ...prev, [date]: data.entries }));
    }
  }

  const maxCalories = Math.max(
    goals?.calories ?? 0,
    ...days.map((d) => d.calories),
    1
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">History</h1>
      {loading ? (
        <p className="py-10 text-center text-sm text-zinc-500">Loading…</p>
      ) : days.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          No logged days yet — start on the Today tab.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {days.map((d) => {
            const overGoal = goals ? d.calories > goals.calories : false;
            return (
              <li
                key={d.date}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40"
              >
                <button
                  onClick={() => toggleDay(d.date)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">
                      {formatDate(d.date)}
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {d.entryCount} item{d.entryCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        overGoal ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {d.calories} kcal
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        overGoal ? "bg-rose-500" : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min((d.calories / maxCalories) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    P {d.protein}g · C {d.carbs}g · F {d.fat}g
                  </p>
                </button>
                {expanded === d.date && (
                  <div className="border-t border-zinc-800 px-4 pb-2">
                    {dayEntries[d.date] ? (
                      <EntryList
                        entries={dayEntries[d.date]}
                        onChanged={async () => {
                          const res = await fetch(`/api/entries?date=${d.date}`);
                          const data = await res.json();
                          setDayEntries((prev) => ({
                            ...prev,
                            [d.date]: data.entries,
                          }));
                          load();
                        }}
                      />
                    ) : (
                      <p className="py-4 text-center text-xs text-zinc-500">
                        Loading…
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

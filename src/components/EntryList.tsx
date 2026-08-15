"use client";

import { useState } from "react";
import type { EntryDto } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EntryList({
  entries,
  onChanged,
}: {
  entries: EntryDto[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  async function remove(id: number) {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    onChanged();
  }

  async function saveQty(id: number) {
    const quantity = parseFloat(editQty);
    if (Number.isFinite(quantity) && quantity > 0) {
      await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
    }
    setEditingId(null);
    onChanged();
  }

  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        Nothing logged yet. Tell me what you ate below.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800/80">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {e.foodName}
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {formatTime(e.loggedAt)}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {editingId === e.id ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    autoFocus
                    value={editQty}
                    onChange={(ev) => setEditQty(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && saveQty(e.id)}
                    className="w-16 rounded border border-zinc-600 bg-zinc-800 px-1.5 py-0.5 text-xs outline-none focus:border-emerald-500"
                  />
                  {e.unit}
                  <button
                    onClick={() => saveQty(e.id)}
                    className="ml-1 text-emerald-400 hover:text-emerald-300"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(e.id);
                    setEditQty(String(e.quantity));
                  }}
                  title="Edit quantity"
                  className="hover:text-zinc-200 hover:underline"
                >
                  {e.quantity} {e.unit}
                </button>
              )}
              <span className="mx-1.5 text-zinc-600">·</span>
              P {e.protein}g · C {e.carbs}g · F {e.fat}g
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {Math.round(e.calories)} kcal
          </span>
          <button
            onClick={() => remove(e.id)}
            title="Delete entry"
            aria-label={`Delete ${e.foodName}`}
            className="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
            >
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}

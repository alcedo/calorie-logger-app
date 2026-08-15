"use client";

import { useCallback, useEffect, useState } from "react";
import { MacroDashboard } from "@/components/MacroDashboard";
import { EntryList } from "@/components/EntryList";
import { LogComposer } from "@/components/LogComposer";
import {
  todayLocalDate,
  type EntryDto,
  type GoalsDto,
  type MacroTotalsDto,
} from "@/lib/types";

interface ChatMessage {
  id: number;
  role: "user" | "app";
  text: string;
  tone?: "ok" | "warn" | "error";
}

interface LogResponse {
  logged?: EntryDto[];
  unresolved?: { name: string; reason: string }[];
  error?: string;
}

let nextMsgId = 1;

export default function TodayPage() {
  const [entries, setEntries] = useState<EntryDto[]>([]);
  const [totals, setTotals] = useState<MacroTotalsDto | null>(null);
  const [goals, setGoals] = useState<GoalsDto | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    return fetch(`/api/entries?date=${todayLocalDate()}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries);
        setTotals(data.totals);
        setGoals(data.goals);
      });
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setAiAvailable(d.aiAvailable))
      .catch(() => setAiAvailable(null));
  }, [refresh]);

  function pushMessage(msg: Omit<ChatMessage, "id">) {
    setMessages((prev) => [...prev.slice(-5), { ...msg, id: nextMsgId++ }]);
  }

  async function handleSubmit(text: string) {
    setBusy(true);
    pushMessage({ role: "user", text });
    try {
      const res = await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, date: todayLocalDate() }),
      });
      const data: LogResponse = await res.json();

      if (!res.ok) {
        pushMessage({
          role: "app",
          text: data.error ?? "Something went wrong.",
          tone: "error",
        });
        return;
      }

      if (data.logged && data.logged.length > 0) {
        const parts = data.logged.map(
          (e) =>
            `${e.quantity} ${e.unit} ${e.foodName} — ${Math.round(
              e.calories
            )} kcal, ${e.protein}g protein`
        );
        pushMessage({
          role: "app",
          text: `Logged: ${parts.join(" · ")}`,
          tone: "ok",
        });
      }
      for (const u of data.unresolved ?? []) {
        pushMessage({
          role: "app",
          text: `Couldn't log "${u.name}": ${u.reason}`,
          tone: "warn",
        });
      }
      await refresh();
    } catch {
      pushMessage({
        role: "app",
        text: "Network error — please try again.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {aiAvailable === false && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          AI is not configured (missing <code>OPENAI_API_KEY</code>). Known
          foods still log fine; unknown foods can&apos;t be looked up until a
          key is set.
        </div>
      )}

      {totals && goals && <MacroDashboard totals={totals} goals={goals} />}

      <section className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-2">
        <h2 className="pt-3 text-sm font-semibold text-zinc-400">
          Today&apos;s food
        </h2>
        <EntryList entries={entries} onChanged={refresh} />
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-4 pt-3 backdrop-blur">
        {messages.length > 0 && (
          <div className="mb-3 flex flex-col gap-1.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "self-end bg-emerald-600/90 text-white"
                    : m.tone === "error"
                      ? "self-start bg-rose-500/15 text-rose-300"
                      : m.tone === "warn"
                        ? "self-start bg-amber-500/15 text-amber-300"
                        : "self-start bg-zinc-800 text-zinc-200"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
        )}
        <LogComposer onSubmit={handleSubmit} busy={busy} />
        <p className="mt-2 text-center text-[11px] text-zinc-600">
          Type or tap the mic and say what you ate — quantities included.
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MacroDashboard } from "@/components/MacroDashboard";
import { EntryList } from "@/components/EntryList";
import { LogComposer } from "@/components/LogComposer";
import { ThoughtProcess } from "@/components/ThoughtProcess";
import { AiPicker } from "@/components/AiPicker";
import {
  todayLocalDate,
  type EntryDto,
  type GoalsDto,
  type MacroTotalsDto,
} from "@/lib/types";
import type { AiStatusDto, ProviderId } from "@/lib/ai/types";
import { apiFetch } from "@/lib/api";
import { logMealFromClient } from "@/lib/log-client";
import type { LogTraceEvent } from "@/lib/log-trace";

interface ChatMessage {
  id: number;
  role: "user" | "app";
  text: string;
  tone?: "ok" | "warn" | "error";
}

let nextMsgId = 1;

export default function TodayPage() {
  const [entries, setEntries] = useState<EntryDto[]>([]);
  const [totals, setTotals] = useState<MacroTotalsDto | null>(null);
  const [goals, setGoals] = useState<GoalsDto | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatusDto | null>(null);
  const [trace, setTrace] = useState<LogTraceEvent[]>([]);

  const refresh = useCallback(() => {
    return apiFetch(`/api/entries?date=${todayLocalDate()}`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data.entries);
        setTotals(data.totals);
        setGoals(data.goals);
      });
  }, []);

  const refreshStatus = useCallback(() => {
    return apiFetch("/api/status")
      .then((r) => r.json())
      .then((d: AiStatusDto) => setAiStatus(d))
      .catch(() => setAiStatus(null));
  }, []);

  useEffect(() => {
    refresh();
    refreshStatus();
  }, [refresh, refreshStatus]);

  function pushMessage(msg: Omit<ChatMessage, "id">) {
    setMessages((prev) => [...prev.slice(-5), { ...msg, id: nextMsgId++ }]);
  }

  async function saveAiPreference(patch: {
    selection?: string;
    models?: Partial<Record<ProviderId, string>>;
  }) {
    const res = await apiFetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preference", ...patch }),
    });
    const data = (await res.json()) as { status?: AiStatusDto };
    if (data.status) setAiStatus(data.status);
  }

  async function handleSubmit(text: string) {
    setBusy(true);
    setTrace([]);
    pushMessage({ role: "user", text });
    try {
      const data = await logMealFromClient(text, todayLocalDate(), (event) => {
        setTrace((prev) => [...prev, event]);
      });

      if (data.error && data.logged.length === 0 && data.unresolved.length === 0) {
        pushMessage({
          role: "app",
          text: data.error,
          tone: "error",
        });
        return;
      }

      if (data.logged.length > 0) {
        const parts = data.logged.map(
          (e) =>
            `${e.quantity} ${e.unit} ${e.foodName} — ${Math.round(
              e.calories,
            )} kcal, ${e.protein}g protein`,
        );
        pushMessage({
          role: "app",
          text: `Logged: ${parts.join(" · ")}`,
          tone: "ok",
        });
      }
      for (const u of data.unresolved) {
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
      {aiStatus?.bannerKind === "api_key" && (
        <Link
          href="/ai"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200"
        >
          {aiStatus.bannerMessage ??
            "Claude would bill an API key. Open AI settings to connect your subscription."}{" "}
          <span className="underline">Open AI settings</span>
        </Link>
      )}

      {aiStatus?.bannerKind === "none" && (
        <Link
          href="/ai"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300"
        >
          {aiStatus.bannerMessage ??
            "AI is not configured. Connect Claude or ChatGPT to look up unknown foods."}{" "}
          <span className="underline">Connect AI</span>
        </Link>
      )}

      {aiStatus && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AiPicker status={aiStatus} onChange={saveAiPreference} compact />
          {aiStatus.bannerKind === "ok" && aiStatus.providerLabel && (
            <p className="text-[11px] text-zinc-500">
              AI: {aiStatus.providerLabel}
              {aiStatus.activeModelLabel ? ` · ${aiStatus.activeModelLabel}` : ""}
            </p>
          )}
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
        {(trace.length > 0 || busy) && (
          <div className="mb-3">
            <ThoughtProcess events={trace} busy={busy} />
          </div>
        )}
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

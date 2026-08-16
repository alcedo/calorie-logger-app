"use client";

import type { LogSearchHitDto, LogTraceEvent } from "@/lib/log-trace";

const SOURCE_LABEL: Record<LogSearchHitDto["source"], string> = {
  usda: "USDA",
  openfoodfacts: "Open Food Facts",
  web: "Web",
};

export function ThoughtProcess({
  events,
  busy,
}: {
  events: LogTraceEvent[];
  busy: boolean;
}) {
  const visible = events.filter((e) => e.type !== "done");
  if (visible.length === 0 && !busy) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Thought process
        </p>
        {busy && (
          <span className="text-[11px] text-emerald-400">Working…</span>
        )}
      </div>
      <ol className="flex max-h-56 flex-col gap-2 overflow-y-auto text-xs leading-relaxed">
        {visible.map((event, i) => (
          <li key={`${event.type}-${i}`}>
            <TraceLine event={event} />
          </li>
        ))}
        {busy && visible.length === 0 && (
          <li className="text-zinc-500">Starting…</li>
        )}
      </ol>
    </div>
  );
}

function TraceLine({ event }: { event: LogTraceEvent }) {
  if (event.type === "step") {
    return (
      <div>
        <p className="text-zinc-200">{event.title}</p>
        {event.detail && (
          <p className="mt-0.5 text-[11px] text-zinc-500">{event.detail}</p>
        )}
      </div>
    );
  }
  if (event.type === "thought") {
    return (
      <p className="border-l-2 border-emerald-700/70 pl-2 italic text-zinc-400">
        {event.text}
      </p>
    );
  }
  if (event.type === "search") {
    return (
      <p className="text-sky-300">
        Web search:{" "}
        <span className="font-medium text-sky-200">{event.query}</span>
      </p>
    );
  }
  if (event.type === "search_result") {
    const { hit } = event;
    return (
      <a
        href={hit.url}
        target="_blank"
        rel="noreferrer"
        className="block rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5 hover:border-zinc-600"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500">
          {SOURCE_LABEL[hit.source]}
        </p>
        <p className="text-zinc-200">{hit.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
          {hit.snippet}
        </p>
      </a>
    );
  }
  if (event.type === "error") {
    return <p className="text-rose-300">{event.message}</p>;
  }
  return null;
}

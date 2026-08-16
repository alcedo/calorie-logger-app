"use client";

import type { AiStatusDto, ProviderId } from "@/lib/ai/types";

const PROVIDER_OPTIONS: { value: AiStatusDto["selection"]; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "claude", label: "Claude" },
  { value: "codex", label: "ChatGPT (Codex)" },
  { value: "openai", label: "OpenAI API" },
  { value: "none", label: "Off" },
];

export function AiPicker({
  status,
  onChange,
  compact = false,
  showAllModels = false,
}: {
  status: AiStatusDto | null;
  onChange: (patch: {
    selection?: string;
    models?: Partial<Record<ProviderId, string>>;
  }) => void;
  compact?: boolean;
  showAllModels?: boolean;
}) {
  if (!status) return null;

  const openaiOn = Boolean(
    status.providers.find((p) => p.id === "openai")?.available,
  );
  const selection = status.selection === "invalid" ? "auto" : status.selection;
  const modelProviders: ProviderId[] = showAllModels
    ? ["claude", "codex", ...(openaiOn ? (["openai"] as const) : [])]
    : selection === "claude" || selection === "codex" || selection === "openai"
      ? [selection]
      : status.provider
        ? [status.provider]
        : [];

  const selectClass = compact
    ? "rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-emerald-500"
    : "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500";

  return (
    <div className={compact ? "flex flex-wrap items-center gap-2" : "space-y-3"}>
      <label className={compact ? "flex items-center gap-1.5" : "block text-xs text-zinc-400"}>
        {!compact && <span className="mb-1 block">Provider</span>}
        {compact && <span className="text-[11px] text-zinc-500">Provider</span>}
        <select
          aria-label="AI provider"
          className={selectClass}
          value={selection}
          onChange={(e) => onChange({ selection: e.target.value })}
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <option
              key={String(opt.value)}
              value={opt.value}
              disabled={opt.value === "openai" && !openaiOn}
            >
              {opt.label}
              {opt.value === "openai" && !openaiOn ? " — set OPENAI_API_KEY" : ""}
            </option>
          ))}
        </select>
      </label>

      {modelProviders.map((modelProvider) => (
        <label
          key={modelProvider}
          className={compact ? "flex items-center gap-1.5" : "block text-xs text-zinc-400"}
        >
          {!compact && (
            <span className="mb-1 block">
              {modelProvider === "claude"
                ? "Claude model"
                : modelProvider === "codex"
                  ? "Codex model"
                  : "OpenAI model"}
            </span>
          )}
          {compact && <span className="text-[11px] text-zinc-500">Model</span>}
          <select
            aria-label={`${modelProvider} model`}
            className={selectClass}
            value={status.models[modelProvider]}
            onChange={(e) =>
              onChange({ models: { [modelProvider]: e.target.value } })
            }
          >
            {(status.modelCatalog[modelProvider] ?? []).map((m) => (
              <option key={m.id || "default"} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

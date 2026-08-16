import {
  getSetting,
  SETTING_AI_CLAUDE_MODEL,
  SETTING_AI_CODEX_MODEL,
  SETTING_AI_OPENAI_MODEL,
} from "../settings";
import type { ProviderId } from "./types";

export interface ModelOption {
  id: string;
  label: string;
}

/** Empty `id` means "let the CLI/SDK pick its default". */
export const MODEL_CATALOG: Record<ProviderId, ModelOption[]> = {
  claude: [
    { id: "", label: "Default (Claude Code)" },
    { id: "haiku", label: "Haiku — fastest" },
    { id: "sonnet", label: "Sonnet — balanced" },
    { id: "opus", label: "Opus — most capable" },
  ],
  codex: [
    { id: "", label: "Default (Codex)" },
    { id: "gpt-5.1-codex", label: "GPT-5.1 Codex" },
    { id: "gpt-5-codex", label: "GPT-5 Codex" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "o4-mini", label: "o4-mini" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-5-mini", label: "GPT-5 mini" },
    { id: "gpt-5", label: "GPT-5" },
    { id: "o4-mini", label: "o4-mini" },
  ],
};

export const MODEL_SETTING_KEYS: Record<ProviderId, string> = {
  claude: SETTING_AI_CLAUDE_MODEL,
  codex: SETTING_AI_CODEX_MODEL,
  openai: SETTING_AI_OPENAI_MODEL,
};

export const MODEL_ENV_KEYS: Record<ProviderId, string> = {
  claude: "AI_CLAUDE_MODEL",
  codex: "AI_CODEX_MODEL",
  openai: "OPENAI_MODEL",
};

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const MODEL_ID_RE = /^[a-zA-Z0-9._:+-]+$/;

export function normalizeModelId(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const value = String(raw).trim();
  if (!value || value === "default") return "";
  if (value.length > 80 || !MODEL_ID_RE.test(value)) return undefined;
  return value;
}

function readSetting(key: string): string | undefined {
  try {
    return getSetting(key);
  } catch {
    return undefined;
  }
}

/**
 * In-app choice wins, then env, then provider default.
 * Empty string means "CLI default" (omit --model).
 */
export function resolveModelFor(provider: ProviderId): string | undefined {
  const fromSetting = normalizeModelId(readSetting(MODEL_SETTING_KEYS[provider]));
  if (fromSetting !== undefined) {
    return fromSetting || undefined;
  }
  const fromEnv = normalizeModelId(process.env[MODEL_ENV_KEYS[provider]]);
  if (fromEnv !== undefined) {
    return fromEnv || undefined;
  }
  if (provider === "openai") return DEFAULT_OPENAI_MODEL;
  return undefined;
}

export function selectedModelId(provider: ProviderId): string {
  const resolved = resolveModelFor(provider);
  if (provider === "openai") return resolved || DEFAULT_OPENAI_MODEL;
  return resolved ?? "";
}

export function labelForModel(provider: ProviderId, id: string): string {
  const match = MODEL_CATALOG[provider].find((m) => m.id === id);
  if (match) return match.label;
  if (!id) return MODEL_CATALOG[provider][0]?.label ?? "Default";
  return `${id} (custom)`;
}

export function catalogWithSelected(
  provider: ProviderId,
  selected: string,
): ModelOption[] {
  const catalog = MODEL_CATALOG[provider];
  if (catalog.some((m) => m.id === selected)) return catalog;
  if (!selected) return catalog;
  return [...catalog, { id: selected, label: `${selected} (custom)` }];
}

export function isAllowedModelId(provider: ProviderId, id: string): boolean {
  if (id === "") return provider !== "openai";
  if (MODEL_CATALOG[provider].some((m) => m.id === id)) return true;
  return MODEL_ID_RE.test(id) && id.length <= 80;
}

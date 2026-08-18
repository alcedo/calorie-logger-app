import { claudeProvider } from "./providers/claude";
import { codexProvider } from "./providers/codex";
import { openaiProvider } from "./providers/openai";
import {
  BATCH_NUTRITION_JSON_SCHEMA,
  PARSE_JSON_SCHEMA,
  PARSE_SYSTEM,
  NUTRITION_SYSTEM,
} from "./schemas";
import { hasStrayAnthropicKey } from "./env";
import { activeLogins } from "./login";
import { resolveAiStatusView } from "./select";
import {
  catalogWithSelected,
  labelForModel,
  resolveModelFor,
  selectedModelId,
} from "./models";
import {
  getSetting,
  SETTING_AI_PROVIDER,
} from "../settings";
import { isServerlessHost } from "../runtime";
import {
  formatSearchResultsForPrompt,
  searchNutritionWeb,
  searchQueryFor,
} from "@/lib/nutrition-search";
import type { LogTraceListener } from "../log-trace";
import type {
  AiNutrition,
  AiProvider,
  AiProviderStatusDto,
  AiSelection,
  AiStatusDto,
  ParsedFoodItem,
  ProviderAvailability,
  ProviderId,
} from "./types";
import { AiUnavailableError } from "./types";

export type {
  AiLoginSessionDto,
  AiNutrition,
  AiProvider,
  AiProviderStatusDto,
  AiSelection,
  AiStatusDto,
  BannerKind,
  ModelOptionDto,
  ParsedFoodItem,
  ProviderAvailability,
  ProviderId,
} from "./types";
export { AiUnavailableError } from "./types";
export {
  interpretClaudeAuthStatus,
  interpretClaudePrintResult,
} from "./claude-parse";
export {
  parseClaudeLoginOutput,
  parseCodexDeviceAuthOutput,
} from "./login-parse";
export { AUTO_ORDER, resolveAiStatusView } from "./select";
export {
  CLAUDE_AUTH_LOGIN_ARGS,
  CLAUDE_AUTH_STATUS_ARGS,
  CODEX_DEVICE_LOGIN_ARGS,
  claudePrintArgs,
  codexExecArgs,
} from "./cli-args";
export { validateClaudeSetupToken } from "./setup-token";
export {
  MODEL_CATALOG,
  catalogWithSelected,
  isAllowedModelId,
  labelForModel,
  normalizeModelId,
  resolveModelFor,
  selectedModelId,
} from "./models";

const PROVIDERS: Record<ProviderId, AiProvider> = {
  claude: claudeProvider,
  codex: codexProvider,
  openai: openaiProvider,
};

const STATUS_TTL_MS = 30_000;

let statusCache: { at: number; value: AiStatusDto } | null = null;

async function readSelection(): Promise<AiSelection | "invalid"> {
  const raw = (
    process.env.AI_PROVIDER ||
    (await getSetting(SETTING_AI_PROVIDER)) ||
    "auto"
  )
    .trim()
    .toLowerCase();
  if (!raw || raw === "auto") return "auto";
  if (raw === "none" || raw === "claude" || raw === "codex" || raw === "openai") {
    return raw;
  }
  return "invalid";
}

function toDto(
  id: ProviderId,
  avail: ProviderAvailability,
): AiProviderStatusDto {
  return {
    id,
    available: avail.available,
    detail: avail.detail,
    reason: avail.reason,
    subscriptionType: avail.subscriptionType,
    authMethod: avail.authMethod,
    cliInstalled: avail.cliInstalled,
  };
}

async function probeAll(): Promise<Record<ProviderId, ProviderAvailability>> {
  const [claude, codex, openai] = await Promise.all([
    claudeProvider.isAvailable(),
    codexProvider.isAvailable(),
    openaiProvider.isAvailable(),
  ]);
  return { claude, codex, openai };
}

export async function getAiStatus(): Promise<AiStatusDto> {
  const now = Date.now();
  if (statusCache && now - statusCache.at < STATUS_TTL_MS) {
    return statusCache.value;
  }

  const selection = await readSelection();
  const probed = await probeAll();
  const providers = (["claude", "codex", "openai"] as const).map((id) =>
    toDto(id, probed[id]),
  );
  const serverlessHost = isServerlessHost();
  const view = resolveAiStatusView({
    selection,
    probed,
    strayAnthropicKey: hasStrayAnthropicKey(),
    invalidProviderRaw: process.env.AI_PROVIDER,
    serverlessHost,
  });

  const models = {
    claude: await selectedModelId("claude"),
    codex: await selectedModelId("codex"),
    openai: await selectedModelId("openai"),
  };
  const modelCatalog = {
    claude: catalogWithSelected("claude", models.claude),
    codex: catalogWithSelected("codex", models.codex),
    openai: catalogWithSelected("openai", models.openai),
  };
  const activeModel = view.provider ? models[view.provider] : null;

  const value: AiStatusDto = {
    ...view,
    selection,
    providers,
    logins: activeLogins(),
    models,
    modelCatalog,
    activeModel,
    activeModelLabel:
      view.provider && activeModel !== null
        ? labelForModel(view.provider, activeModel)
        : null,
    serverlessHost,
  };
  statusCache = { at: now, value };
  return value;
}

export function clearAiStatusCache(): void {
  statusCache = null;
}

export async function aiAvailable(): Promise<boolean> {
  const status = await getAiStatus();
  return status.aiAvailable;
}

async function requireProvider(): Promise<AiProvider> {
  const status = await getAiStatus();
  if (!status.aiAvailable || !status.provider) {
    throw new AiUnavailableError(
      status.bannerMessage ??
        "AI is not configured. Sign in with `claude auth login`.",
    );
  }
  return PROVIDERS[status.provider];
}

export interface AiCallOptions {
  onEvent?: LogTraceListener;
}

export async function parseMealText(
  text: string,
  opts?: AiCallOptions,
): Promise<ParsedFoodItem[]> {
  const provider = await requireProvider();
  const parsed = await provider.generateJson<{
    items: ParsedFoodItem[];
    reasoning?: string;
  }>({
    system: PARSE_SYSTEM,
    user: text,
    schemaName: "meal_items",
    schema: PARSE_JSON_SCHEMA,
    model: await resolveModelFor(provider.id),
  });
  const reasoning =
    typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "";
  if (reasoning) {
    opts?.onEvent?.({ type: "thought", text: reasoning });
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items.filter(
    (i) => i && typeof i.name === "string" && i.name.trim().length > 0,
  );
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNutrition(
  raw: Record<string, unknown>,
  fallbackQuery: string,
): AiNutrition {
  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases.map((a) => String(a))
    : [];
  const name = String(raw.name ?? fallbackQuery).trim() || fallbackQuery;
  return {
    name,
    aliases,
    servingSize: asNumber(raw.servingSize, 1),
    servingUnit: String(raw.servingUnit ?? "serving"),
    calories: asNumber(raw.calories),
    protein: asNumber(raw.protein),
    carbs: asNumber(raw.carbs),
    fat: asNumber(raw.fat),
    fiber: asNumber(raw.fiber),
    sugar: asNumber(raw.sugar),
    sodium: asNumber(raw.sodium),
  };
}

function matchFood(
  query: string,
  foods: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  const q = query.trim().toLowerCase();
  return (
    foods.find(
      (f) => String(f.query ?? "").trim().toLowerCase() === q,
    ) ??
    foods.find((f) => String(f.name ?? "").trim().toLowerCase() === q)
  );
}

/** Batch nutrition lookup. Web search first, then one CLI/API call for all names. */
export async function lookupNutrition(
  names: string[],
  opts?: AiCallOptions,
): Promise<Map<string, AiNutrition>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const out = new Map<string, AiNutrition>();
  if (unique.length === 0) return out;

  const hitsByFood = new Map<string, Awaited<ReturnType<typeof searchNutritionWeb>>>();
  for (const name of unique) {
    const query = searchQueryFor(name);
    opts?.onEvent?.({ type: "search", query });
    const hits = await searchNutritionWeb(name);
    hitsByFood.set(name, hits);
    for (const hit of hits) {
      opts?.onEvent?.({ type: "search_result", query, hit });
    }
    if (hits.length === 0) {
      opts?.onEvent?.({
        type: "step",
        id: `search-empty-${name}`,
        title: `No web results for ${name}`,
        detail: "The model will estimate from training knowledge.",
      });
    }
  }

  const provider = await requireProvider();
  const parsed = await provider.generateJson<{
    foods: Record<string, unknown>[];
    reasoning?: string;
    sources?: Array<{ title?: string; url?: string }>;
  }>({
    system: NUTRITION_SYSTEM,
    user: `Nutrition facts for these foods:\n${unique
      .map((n, i) => `${i + 1}. ${n}`)
      .join("\n")}\n\nLive web search results:\n${formatSearchResultsForPrompt(
      hitsByFood,
    )}`,
    schemaName: "food_nutrition_batch",
    schema: BATCH_NUTRITION_JSON_SCHEMA,
    model: await resolveModelFor(provider.id),
  });

  const reasoning =
    typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "";
  if (reasoning) {
    opts?.onEvent?.({ type: "thought", text: reasoning });
  }
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];
  for (const source of sources) {
    const url = typeof source?.url === "string" ? source.url.trim() : "";
    const title =
      (typeof source?.title === "string" && source.title.trim()) || url;
    if (!url) continue;
    opts?.onEvent?.({
      type: "search_result",
      query: "cited source",
      hit: {
        title,
        url,
        snippet: "Cited by the model",
        source: "web",
      },
    });
  }

  const foods = Array.isArray(parsed.foods) ? parsed.foods : [];
  for (let i = 0; i < unique.length; i++) {
    const query = unique[i];
    const raw = matchFood(query, foods) ?? foods[i];
    if (!raw || typeof raw !== "object") continue;
    out.set(query, asNutrition(raw, query));
  }
  return out;
}

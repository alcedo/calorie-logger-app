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
import type {
  AiNutrition,
  AiProvider,
  AiProviderStatusDto,
  AiSelection,
  AiStatusDto,
  BannerKind,
  ParsedFoodItem,
  ProviderAvailability,
  ProviderId,
} from "./types";
import { AiUnavailableError } from "./types";

export type {
  AiNutrition,
  AiProvider,
  AiProviderStatusDto,
  AiSelection,
  AiStatusDto,
  BannerKind,
  ParsedFoodItem,
  ProviderAvailability,
  ProviderId,
} from "./types";
export { AiUnavailableError } from "./types";
export {
  interpretClaudeAuthStatus,
  interpretClaudePrintResult,
} from "./claude-parse";

const PROVIDERS: Record<ProviderId, AiProvider> = {
  claude: claudeProvider,
  codex: codexProvider,
  openai: openaiProvider,
};

const AUTO_ORDER: ProviderId[] = ["claude", "codex"];
const STATUS_TTL_MS = 30_000;

const NONE_BANNER =
  "AI is not configured. Sign in with `claude auth login` (or `codex login`). Known foods still log; unknown foods can't be looked up. `OPENAI_API_KEY` is a paid opt-in — set `AI_PROVIDER=openai` to use it.";

const API_KEY_BANNER =
  "Claude Code would bill an API key instead of your subscription. Unset `ANTHROPIC_API_KEY` (and `ANTHROPIC_AUTH_TOKEN`), then run `claude auth login`.";

let statusCache: { at: number; value: AiStatusDto } | null = null;

function readSelection(): AiSelection | "invalid" {
  const raw = (process.env.AI_PROVIDER ?? "auto").trim().toLowerCase();
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
  };
}

function claudeLabel(avail: ProviderAvailability): string {
  const plan = avail.subscriptionType;
  if (plan) return `Claude Code (${plan} subscription)`;
  if (avail.authMethod === "oauth_token") return "Claude Code (OAuth token)";
  return "Claude Code (subscription)";
}

function labelFor(id: ProviderId, avail: ProviderAvailability): string {
  if (id === "claude") return claudeLabel(avail);
  if (id === "codex") return "Codex CLI (ChatGPT login)";
  return "OpenAI API key";
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

  const selection = readSelection();
  const probed = await probeAll();
  const providers = (["claude", "codex", "openai"] as const).map((id) =>
    toDto(id, probed[id]),
  );

  let activeId: ProviderId | null = null;
  let bannerKind: BannerKind = "none";
  let bannerMessage: string | null = NONE_BANNER;

  if (selection === "invalid") {
    bannerKind = "none";
    bannerMessage = `Unknown AI_PROVIDER "${process.env.AI_PROVIDER}". Use auto, claude, codex, openai, or none.`;
  } else if (selection === "none") {
    bannerKind = "none";
    bannerMessage = NONE_BANNER;
  } else if (selection === "auto") {
    for (const id of AUTO_ORDER) {
      if (probed[id].available) {
        activeId = id;
        break;
      }
    }
    if (activeId) {
      bannerKind = "ok";
      bannerMessage = null;
    } else if (
      probed.claude.reason === "api_key" ||
      hasStrayAnthropicKey()
    ) {
      bannerKind = "api_key";
      bannerMessage =
        probed.claude.reason === "api_key"
          ? probed.claude.detail
          : API_KEY_BANNER;
    } else {
      bannerKind = "none";
      bannerMessage = NONE_BANNER;
    }
  } else {
    const avail = probed[selection];
    if (avail.available) {
      activeId = selection;
      bannerKind = "ok";
      bannerMessage = null;
    } else {
      bannerKind = avail.reason === "api_key" ? "api_key" : "none";
      if (selection === "openai") {
        bannerMessage =
          "AI_PROVIDER is openai but OPENAI_API_KEY is not set.";
      } else if (selection === "claude") {
        bannerMessage = avail.detail;
      } else {
        bannerMessage = avail.detail;
      }
    }
  }

  const value: AiStatusDto = {
    aiAvailable: activeId !== null,
    provider: activeId,
    providerLabel: activeId
      ? labelFor(activeId, probed[activeId])
      : null,
    selection,
    providers,
    bannerKind,
    bannerMessage,
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

export async function parseMealText(text: string): Promise<ParsedFoodItem[]> {
  const provider = await requireProvider();
  const parsed = await provider.generateJson<{ items: ParsedFoodItem[] }>({
    system: PARSE_SYSTEM,
    user: text,
    schemaName: "meal_items",
    schema: PARSE_JSON_SCHEMA,
  });
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

/** Batch nutrition lookup. One CLI/API call for all names. */
export async function lookupNutrition(
  names: string[],
): Promise<Map<string, AiNutrition>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const out = new Map<string, AiNutrition>();
  if (unique.length === 0) return out;

  const provider = await requireProvider();
  const parsed = await provider.generateJson<{
    foods: Record<string, unknown>[];
  }>({
    system: NUTRITION_SYSTEM,
    user: `Nutrition facts for these foods:\n${unique
      .map((n, i) => `${i + 1}. ${n}`)
      .join("\n")}`,
    schemaName: "food_nutrition_batch",
    schema: BATCH_NUTRITION_JSON_SCHEMA,
  });

  const foods = Array.isArray(parsed.foods) ? parsed.foods : [];
  for (let i = 0; i < unique.length; i++) {
    const query = unique[i];
    const raw = matchFood(query, foods) ?? foods[i];
    if (!raw || typeof raw !== "object") continue;
    out.set(query, asNutrition(raw, query));
  }
  return out;
}

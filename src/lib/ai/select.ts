import type {
  AiSelection,
  AiStatusDto,
  BannerKind,
  ProviderAvailability,
  ProviderId,
} from "./types";
import { SERVERLESS_NONE_BANNER } from "../runtime";

export const AUTO_ORDER: ProviderId[] = ["claude", "codex"];

export const NONE_BANNER =
  "AI is not configured. Connect Claude or ChatGPT on the AI page to look up unknown foods.";

export const API_KEY_BANNER =
  "Claude Code would bill an API key instead of your subscription. Unset `ANTHROPIC_API_KEY` (and `ANTHROPIC_AUTH_TOKEN`), then connect Claude from the AI page.";

export function claudeLabel(avail: ProviderAvailability): string {
  const plan = avail.subscriptionType;
  if (plan) return `Claude Code (${plan} subscription)`;
  if (avail.authMethod === "oauth_token") return "Claude Code (OAuth token)";
  return "Claude Code (subscription)";
}

export function labelFor(id: ProviderId, avail: ProviderAvailability): string {
  if (id === "claude") return claudeLabel(avail);
  if (id === "codex") return "Codex CLI (ChatGPT login)";
  return "OpenAI API key";
}

export interface ResolveAiStatusInput {
  selection: AiSelection | "invalid";
  probed: Record<ProviderId, ProviderAvailability>;
  strayAnthropicKey?: boolean;
  invalidProviderRaw?: string;
  serverlessHost?: boolean;
}

export type ResolvedAiStatusView = Pick<
  AiStatusDto,
  "aiAvailable" | "provider" | "providerLabel" | "bannerKind" | "bannerMessage"
>;

export function resolveAiStatusView(
  input: ResolveAiStatusInput,
): ResolvedAiStatusView {
  const { selection, probed } = input;
  let activeId: ProviderId | null = null;
  let bannerKind: BannerKind = "none";
  let bannerMessage: string | null = NONE_BANNER;

  if (selection === "invalid") {
    bannerKind = "none";
    bannerMessage = `Unknown AI_PROVIDER "${input.invalidProviderRaw ?? ""}". Use auto, claude, codex, openai, or none.`;
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
    } else if (input.serverlessHost && probed.openai.available) {
      activeId = "openai";
      bannerKind = "ok";
      bannerMessage = null;
    } else if (input.serverlessHost) {
      bannerKind = "none";
      bannerMessage = SERVERLESS_NONE_BANNER;
    } else if (probed.claude.reason === "api_key" || input.strayAnthropicKey) {
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
        bannerMessage = "AI_PROVIDER is openai but OPENAI_API_KEY is not set.";
      } else {
        bannerMessage = avail.detail;
      }
    }
  }

  return {
    aiAvailable: activeId !== null,
    provider: activeId,
    providerLabel: activeId ? labelFor(activeId, probed[activeId]) : null,
    bannerKind,
    bannerMessage,
  };
}

import type { ProviderAvailability } from "./types";

export interface ClaudePrintPayload {
  is_error?: unknown;
  subtype?: unknown;
  terminal_reason?: unknown;
  result?: unknown;
  structured_output?: unknown;
}

export type ClaudePrintOutcome =
  | { ok: true; value: unknown }
  | { ok: false; message: string; terminalReason?: string; subtype?: string };

/**
 * Interpret a `claude -p --output-format json` payload.
 *
 * Measured on Claude Code 2.1.233: an unauthenticated run returns
 * `{ is_error: true, subtype: "success", terminal_reason: "api_error" }`
 * with no `structured_output` and exits 1. Never treat `subtype === "success"`
 * as success.
 */
export function interpretClaudePrintResult(
  stdout: string,
  stderr: string,
  exitCode: number | null,
): ClaudePrintOutcome {
  let payload: ClaudePrintPayload | null = null;
  const trimmed = stdout.trim();
  if (trimmed.includes("{")) {
    try {
      const start = trimmed.indexOf("{");
      payload = JSON.parse(trimmed.slice(start)) as ClaudePrintPayload;
    } catch {
      payload = null;
    }
  }

  if (payload) {
    if (payload.is_error === true) {
      const result =
        typeof payload.result === "string" && payload.result.trim()
          ? payload.result.trim()
          : "Claude Code reported an error";
      const terminalReason =
        typeof payload.terminal_reason === "string"
          ? payload.terminal_reason
          : undefined;
      return { ok: false, message: result, terminalReason };
    }

    if (!("structured_output" in payload) || payload.structured_output == null) {
      const subtype =
        typeof payload.subtype === "string" ? payload.subtype : undefined;
      const message =
        subtype === "error_max_structured_output_retries"
          ? "Claude Code exhausted structured-output retries."
          : "Claude Code returned no structured_output.";
      return { ok: false, message, subtype };
    }

    let value = payload.structured_output;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return {
          ok: false,
          message: "Claude Code structured_output was a non-JSON string.",
        };
      }
    }
    return { ok: true, value };
  }

  if (exitCode !== 0 && exitCode !== null) {
    const detail = stderr.trim() || trimmed;
    return {
      ok: false,
      message: detail
        ? `claude exited ${exitCode}: ${detail}`
        : `claude exited ${exitCode}`,
    };
  }

  return { ok: false, message: "Claude Code returned no JSON output" };
}

interface AuthStatusJson {
  loggedIn?: unknown;
  authMethod?: unknown;
  apiKeySource?: unknown;
  subscriptionType?: unknown;
}

/**
 * Interpret `claude auth status` JSON (non-TTY). Field names are observed on
 * 2.1.233 rather than documented.
 *
 * The probe MUST be spawned with the same pruned env as the real call.
 * `ANTHROPIC_AUTH_TOKEN` reports `authMethod: "oauth_token"` identically to a
 * real `claude setup-token`, which is why env pruning — not this parser —
 * is what keeps API billing out.
 */
export function interpretClaudeAuthStatus(
  stdout: string,
): ProviderAvailability {
  let parsed: AuthStatusJson;
  try {
    const trimmed = stdout.trim();
    const start = trimmed.indexOf("{");
    if (start < 0) {
      return {
        available: false,
        detail: "Could not parse `claude auth status` output.",
        reason: "error",
      };
    }
    parsed = JSON.parse(trimmed.slice(start)) as AuthStatusJson;
  } catch {
    return {
      available: false,
      detail: "Could not parse `claude auth status` output.",
      reason: "error",
    };
  }

  const authMethod =
    typeof parsed.authMethod === "string" ? parsed.authMethod : undefined;
  const apiKeySource =
    parsed.apiKeySource == null || parsed.apiKeySource === ""
      ? undefined
      : String(parsed.apiKeySource);
  const subscriptionType =
    parsed.subscriptionType === undefined
      ? undefined
      : parsed.subscriptionType === null
        ? null
        : String(parsed.subscriptionType);

  if (parsed.loggedIn !== true) {
    return {
      available: false,
      detail: "Not logged in. Run `claude auth login`.",
      reason: "missing",
      authMethod,
    };
  }

  if (apiKeySource) {
    return {
      available: false,
      detail: `Would bill an API key (${apiKeySource}). Unset ANTHROPIC_API_KEY to use your Claude subscription.`,
      reason: "api_key",
      authMethod,
      subscriptionType: subscriptionType ?? null,
    };
  }

  if (authMethod === "api_key") {
    return {
      available: false,
      detail:
        "Claude Code is using an API key. Unset ANTHROPIC_API_KEY and run `claude auth login`.",
      reason: "api_key",
      authMethod,
    };
  }

  if (authMethod !== "claude.ai" && authMethod !== "oauth_token") {
    return {
      available: false,
      detail: authMethod
        ? `Claude Code auth method "${authMethod}" is not a subscription login.`
        : "Claude Code did not report a subscription auth method.",
      reason: "error",
      authMethod,
    };
  }

  // A stored claude.ai login with subscriptionType null is the tell that a
  // stray key is displacing the plan. oauth_token from setup-token often
  // omits subscriptionType; that is not a red flag.
  if (authMethod === "claude.ai" && (subscriptionType === null || subscriptionType === undefined || subscriptionType === "")) {
    return {
      available: false,
      detail:
        "Claude Code reports a claude.ai login but subscriptionType is null — a key in the environment is likely displacing it. Unset ANTHROPIC_API_KEY.",
      reason: "api_key",
      authMethod,
      subscriptionType: null,
    };
  }

  const plan =
    typeof subscriptionType === "string" && subscriptionType
      ? subscriptionType
      : null;
  const planLabel = plan ? ` (${plan})` : "";
  return {
    available: true,
    detail:
      authMethod === "oauth_token"
        ? `OAuth token${planLabel}`
        : `Subscription login${planLabel}`,
    authMethod,
    subscriptionType: plan,
  };
}

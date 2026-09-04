import type { GenerateJsonRequest } from "./types";
import type { CodexAuthTokens } from "./credentials";

export const CODEX_RESPONSES_URL =
  "https://chatgpt.com/backend-api/codex/responses";
export const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const CODEX_OAUTH_TOKEN_URL = "https://auth.openai.com/oauth/token";
export const CODEX_DEVICE_USERCODE_URL =
  "https://auth.openai.com/api/accounts/deviceauth/usercode";
export const CODEX_DEVICE_TOKEN_URL =
  "https://auth.openai.com/api/accounts/deviceauth/token";
export const CODEX_DEVICE_VERIFY_URL = "https://auth.openai.com/codex/device";
export const CODEX_DEVICE_REDIRECT_URI =
  "https://auth.openai.com/deviceauth/callback";

export function codexHttpModelId(model?: string): string {
  const id = (model ?? "").trim();
  return id || "gpt-5.1-codex";
}

export function parseAccountIdFromIdToken(idToken: string | undefined): string | undefined {
  if (!idToken) return undefined;
  const parts = idToken.split(".");
  if (parts.length < 2) return undefined;
  try {
    const json = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    const auth = json["https://chatgpt.com/auth"] as
      | Record<string, unknown>
      | undefined;
    const nested =
      (typeof json.chatgpt_account_id === "string" && json.chatgpt_account_id) ||
      (typeof auth?.chatgpt_account_id === "string" && auth.chatgpt_account_id) ||
      undefined;
    return nested || undefined;
  } catch {
    return undefined;
  }
}

export async function refreshCodexTokens(
  tokens: CodexAuthTokens,
): Promise<CodexAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: CODEX_CLIENT_ID,
  });
  const res = await fetch(CODEX_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await res.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    error?: string;
  } | null;
  if (!res.ok || !payload?.access_token) {
    throw new Error(payload?.error || `Codex token refresh failed (${res.status})`);
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || tokens.refreshToken,
    accountId:
      parseAccountIdFromIdToken(payload.id_token) || tokens.accountId,
  };
}

function outputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }
  const texts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text) texts.push(part.text);
    }
  }
  return texts.join("") || null;
}

export async function generateJsonViaCodexHttp<T>(
  tokens: CodexAuthTokens,
  req: GenerateJsonRequest,
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${tokens.accessToken}`,
    "openai-beta": "responses=v1",
    originator: "calorie-logger",
    version: "0.153.2",
  };
  if (tokens.accountId) headers["chatgpt-account-id"] = tokens.accountId;

  const res = await fetch(CODEX_RESPONSES_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: codexHttpModelId(req.model),
      input: `${req.system}\n\n${req.user}`,
      text: {
        format: {
          type: "json_schema",
          name: req.schemaName,
          strict: true,
          schema: req.schema,
        },
      },
    }),
  });
  const payload = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  } | null;
  if (!res.ok) {
    throw new Error(payload?.error?.message || `Codex HTTP ${res.status}`);
  }
  const text = payload ? outputText(payload) : null;
  if (!text) throw new Error("Codex HTTP returned no text");
  return JSON.parse(text) as T;
}

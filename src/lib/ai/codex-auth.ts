import {
  CODEX_CLIENT_ID,
  CODEX_DEVICE_REDIRECT_URI,
  CODEX_DEVICE_TOKEN_URL,
  CODEX_DEVICE_USERCODE_URL,
  CODEX_DEVICE_VERIFY_URL,
  CODEX_OAUTH_TOKEN_URL,
  parseAccountIdFromIdToken,
} from "./codex-http";
import type { CodexAuthTokens } from "./credentials";

export interface CodexDeviceStart {
  loginUrl: string;
  userCode: string;
  deviceAuthId: string;
  intervalMs: number;
}

export async function startCodexDeviceAuth(): Promise<CodexDeviceStart> {
  const res = await fetch(CODEX_DEVICE_USERCODE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
  });
  const json = (await res.json().catch(() => null)) as {
    device_auth_id?: string;
    user_code?: string;
    interval?: number | string;
  } | null;
  if (!res.ok || !json?.device_auth_id || !json.user_code) {
    throw new Error("ChatGPT device login could not start.");
  }
  const interval =
    typeof json.interval === "number"
      ? json.interval
      : Number(json.interval ?? 2);
  return {
    loginUrl: CODEX_DEVICE_VERIFY_URL,
    userCode: json.user_code,
    deviceAuthId: json.device_auth_id,
    intervalMs: Math.max(1, Number.isFinite(interval) ? interval : 2) * 1000,
  };
}

export type CodexDevicePoll =
  | { status: "pending" }
  | { status: "slow_down" }
  | { status: "ready"; tokens: CodexAuthTokens };

export async function pollCodexDeviceAuth(
  deviceAuthId: string,
  userCode: string,
): Promise<CodexDevicePoll> {
  const res = await fetch(CODEX_DEVICE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      device_auth_id: deviceAuthId,
      user_code: userCode,
    }),
  });
  const json = (await res.json().catch(() => null)) as {
    error?: string | { code?: string };
    authorization_code?: string;
    code_verifier?: string;
  } | null;
  const error =
    typeof json?.error === "string"
      ? json.error
      : json?.error && typeof json.error === "object"
        ? json.error.code
        : "";
  if (error === "deviceauth_authorization_pending") {
    return { status: "pending" };
  }
  if (error === "slow_down") return { status: "slow_down" };
  if (!json?.authorization_code || !json.code_verifier) {
    if (!res.ok) return { status: "pending" };
    throw new Error("ChatGPT device login failed.");
  }
  const tokens = await exchangeCodexDeviceCode(
    json.authorization_code,
    json.code_verifier,
  );
  return { status: "ready", tokens };
}

async function exchangeCodexDeviceCode(
  code: string,
  verifier: string,
): Promise<CodexAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CODEX_CLIENT_ID,
    code,
    code_verifier: verifier,
    redirect_uri: CODEX_DEVICE_REDIRECT_URI,
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
  if (!res.ok || !payload?.access_token || !payload.refresh_token) {
    throw new Error(payload?.error || "ChatGPT token exchange failed.");
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    accountId: parseAccountIdFromIdToken(payload.id_token),
  };
}

import { AsyncLocalStorage } from "node:async_hooks";
import {
  deleteSetting,
  getSetting,
  setSetting,
  SETTING_CLAUDE_OAUTH_TOKEN,
} from "../settings";
import { validateClaudeSetupToken } from "./setup-token";

export const SETTING_CODEX_AUTH = "codex_auth_json";
export const CLAUDE_OAUTH_COOKIE = "macro_claude_oat";
export const CODEX_AUTH_COOKIE = "macro_codex_auth";

export type CredentialSource = "env" | "settings" | "cookie" | "request";

export interface ClaudeCredential {
  kind: "claude_oauth";
  token: string;
  source: CredentialSource;
}

export interface CodexAuthTokens {
  accessToken: string;
  refreshToken: string;
  accountId?: string;
}

export interface CodexCredential extends CodexAuthTokens {
  kind: "chatgpt_oauth";
  source: CredentialSource;
}

export interface CredentialOverlay {
  claudeToken?: string;
  codexAuth?: CodexAuthTokens;
}

const overlayAls = new AsyncLocalStorage<CredentialOverlay>();

export function runWithRequestCredentials<T>(
  overlay: CredentialOverlay,
  fn: () => T,
): T {
  return overlayAls.run(overlay, fn);
}

export function requestCredentialOverlay(): CredentialOverlay {
  return overlayAls.getStore() ?? {};
}

export function replaceRequestCodexAuth(tokens: CodexAuthTokens): void {
  const current = overlayAls.getStore();
  if (current) current.codexAuth = tokens;
}

export function parseCodexAuthJson(
  raw: string | undefined | null,
): CodexAuthTokens | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const tokens = (parsed.tokens ?? parsed) as Record<string, unknown>;
    const accessToken =
      (typeof tokens.accessToken === "string" && tokens.accessToken) ||
      (typeof tokens.access_token === "string" && tokens.access_token) ||
      "";
    const refreshToken =
      (typeof tokens.refreshToken === "string" && tokens.refreshToken) ||
      (typeof tokens.refresh_token === "string" && tokens.refresh_token) ||
      "";
    const accountId =
      (typeof parsed.accountId === "string" && parsed.accountId) ||
      (typeof parsed.account_id === "string" && parsed.account_id) ||
      (typeof tokens.account_id === "string" && tokens.account_id) ||
      undefined;
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken, accountId };
  } catch {
    return null;
  }
}

export function serializeCodexAuth(tokens: CodexAuthTokens): string {
  return JSON.stringify({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accountId: tokens.accountId,
  });
}

function setting(key: string): string | undefined {
  try {
    return getSetting(key);
  } catch {
    return undefined;
  }
}

export function readClaudeCredential(): ClaudeCredential | null {
  const overlay = requestCredentialOverlay().claudeToken?.trim();
  if (overlay) {
    const parsed = validateClaudeSetupToken(overlay);
    if (parsed.ok) return { kind: "claude_oauth", token: parsed.token, source: "request" };
  }
  const fromEnv = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  if (fromEnv) {
    const parsed = validateClaudeSetupToken(fromEnv);
    if (parsed.ok) return { kind: "claude_oauth", token: parsed.token, source: "env" };
  }
  const stored = setting(SETTING_CLAUDE_OAUTH_TOKEN);
  if (stored) {
    const parsed = validateClaudeSetupToken(stored);
    if (parsed.ok) return { kind: "claude_oauth", token: parsed.token, source: "settings" };
  }
  return null;
}

export function readCodexCredential(): CodexCredential | null {
  const overlay = requestCredentialOverlay().codexAuth;
  if (overlay) return { kind: "chatgpt_oauth", source: "request", ...overlay };
  const fromEnv = parseCodexAuthJson(process.env.CODEX_AUTH_JSON);
  if (fromEnv) return { kind: "chatgpt_oauth", source: "env", ...fromEnv };
  const stored = parseCodexAuthJson(setting(SETTING_CODEX_AUTH));
  if (stored) return { kind: "chatgpt_oauth", source: "settings", ...stored };
  return null;
}

export function persistClaudeToken(token: string): void {
  setSetting(SETTING_CLAUDE_OAUTH_TOKEN, token);
}

export function persistCodexAuth(tokens: CodexAuthTokens): void {
  setSetting(SETTING_CODEX_AUTH, serializeCodexAuth(tokens));
}

export function clearClaudeToken(): void {
  deleteSetting(SETTING_CLAUDE_OAUTH_TOKEN);
}

export function clearCodexAuth(): void {
  deleteSetting(SETTING_CODEX_AUTH);
}

export function overlayFromCookieHeader(
  cookieHeader: string | null | undefined,
): CredentialOverlay {
  if (!cookieHeader) return {};
  const map: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = decodeURIComponent(part.slice(eq + 1).trim());
    map[name] = value;
  }
  return {
    claudeToken: map[CLAUDE_OAUTH_COOKIE],
    codexAuth: parseCodexAuthJson(map[CODEX_AUTH_COOKIE]) ?? undefined,
  };
}

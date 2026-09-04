import { cookies } from "next/headers";
import {
  CLAUDE_OAUTH_COOKIE,
  CODEX_AUTH_COOKIE,
  parseCodexAuthJson,
  readClaudeCredential,
  readCodexCredential,
  runWithRequestCredentials,
  serializeCodexAuth,
  type CredentialOverlay,
} from "./credentials";
import type { CodexDeviceState } from "./login";

export const CODEX_DEVICE_COOKIE = "macro_codex_device";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

const DEVICE_COOKIE_OPTS = {
  ...COOKIE_OPTS,
  maxAge: 15 * 60,
};

export async function overlayFromNextCookies(): Promise<CredentialOverlay> {
  try {
    const jar = await cookies();
    return {
      claudeToken: jar.get(CLAUDE_OAUTH_COOKIE)?.value,
      codexAuth: parseCodexAuthJson(jar.get(CODEX_AUTH_COOKIE)?.value) ?? undefined,
    };
  } catch {
    return {};
  }
}

export async function withRequestCookies<T>(fn: () => Promise<T>): Promise<T> {
  const overlay = await overlayFromNextCookies();
  return runWithRequestCredentials(overlay, fn);
}

export async function syncCredentialCookies(): Promise<void> {
  try {
    const jar = await cookies();
    const claude = readClaudeCredential();
    const codex = readCodexCredential();
    if (claude) jar.set(CLAUDE_OAUTH_COOKIE, claude.token, COOKIE_OPTS);
    else jar.delete(CLAUDE_OAUTH_COOKIE);
    if (codex) jar.set(CODEX_AUTH_COOKIE, serializeCodexAuth(codex), COOKIE_OPTS);
    else jar.delete(CODEX_AUTH_COOKIE);
  } catch {
    /* tests and non-request callers have no cookie jar */
  }
}

export async function writeCodexDeviceCookie(
  state: CodexDeviceState | null,
): Promise<void> {
  try {
    const jar = await cookies();
    if (!state) {
      jar.delete(CODEX_DEVICE_COOKIE);
      return;
    }
    jar.set(CODEX_DEVICE_COOKIE, JSON.stringify(state), DEVICE_COOKIE_OPTS);
  } catch {
    /* tests and non-request callers have no cookie jar */
  }
}

export async function readCodexDeviceCookie(): Promise<CodexDeviceState | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(CODEX_DEVICE_COOKIE)?.value;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CodexDeviceState>;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.deviceAuthId !== "string" ||
      typeof parsed.userCode !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return {
      sessionId: parsed.sessionId,
      deviceAuthId: parsed.deviceAuthId,
      userCode: parsed.userCode,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Claude `setup-token` is an OAuth access token (`sk-ant-oat…`).
 * API keys (`sk-ant-api…`, `sk-…`) must never be stored — they bill the
 * Anthropic console instead of a Claude subscription.
 */
export function validateClaudeSetupToken(
  raw: string,
): { ok: true; token: string } | { ok: false; error: string } {
  const token = raw.trim();
  if (!token) {
    return { ok: false, error: "Paste a Claude setup-token" };
  }
  if (token.startsWith("sk-ant-oat")) {
    return { ok: true, token };
  }
  if (token.startsWith("sk-ant-api") || token.startsWith("sk-")) {
    return {
      ok: false,
      error:
        "That looks like an API key. This app only accepts a Claude subscription token from `claude setup-token`.",
    };
  }
  return { ok: true, token };
}

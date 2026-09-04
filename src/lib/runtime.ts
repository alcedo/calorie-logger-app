export function isServerlessHost(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const value = env.VERCEL;
  return value === "1" || value === "true";
}

export const SERVERLESS_CLI_DETAIL =
  "Claude Code and Codex CLIs cannot spawn on Vercel. Paste a Claude setup-token or connect ChatGPT. Those credentials call your subscription over HTTP.";

export const SERVERLESS_NONE_BANNER =
  "AI lookup on Vercel needs a Claude setup-token, a ChatGPT login, or OPENAI_API_KEY.";

export const SERVERLESS_CONNECT_ERROR =
  "Claude CLI login cannot run on Vercel. Paste a setup-token from `claude setup-token` instead.";

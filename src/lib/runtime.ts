export function isServerlessHost(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const value = env.VERCEL;
  return value === "1" || value === "true";
}

export const SERVERLESS_CLI_DETAIL =
  "Claude Code and Codex CLIs cannot run on Vercel. Set OPENAI_API_KEY to look up unknown foods, or run the app on a machine with the CLI.";

export const SERVERLESS_NONE_BANNER =
  "AI lookup on Vercel requires the OpenAI API. Set OPENAI_API_KEY.";

export const SERVERLESS_CONNECT_ERROR =
  "Claude and ChatGPT CLI logins cannot run on Vercel. Set OPENAI_API_KEY instead.";

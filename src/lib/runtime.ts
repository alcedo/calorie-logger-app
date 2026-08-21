/**
 * Host capability checks for local Node vs serverless (Vercel) deploys.
 * CLI providers spawn `claude` / `codex`; those binaries cannot run in
 * Vercel Functions.
 */

export const SERVERLESS_CLI_DETAIL =
  "Claude Code and Codex CLIs cannot run on Vercel. Set AI_PROVIDER=openai and OPENAI_API_KEY to look up unknown foods, or run the app on a machine with the CLI.";

export const SERVERLESS_NONE_BANNER =
  "AI lookup on Vercel requires the OpenAI API. Set AI_PROVIDER=openai and OPENAI_API_KEY.";

export const SERVERLESS_CONNECT_ERROR =
  "Claude and ChatGPT CLI logins cannot run on Vercel. Set AI_PROVIDER=openai and OPENAI_API_KEY instead.";

export const VERCEL_DB_REQUIRED_ERROR =
  "Vercel deployments need a hosted SQLite database. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN. Local file SQLite is ephemeral on Vercel and will lose data.";

export function isServerlessHost(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.VERCEL === "1" || env.VERCEL === "true";
}

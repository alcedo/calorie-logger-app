/**
 * Child environments for CLI subprocesses.
 *
 * Spawn replaces the entire env when `env` is set, so we copy process.env
 * then drop credentials that would silently switch billing to an API key.
 * CLAUDE_CODE_OAUTH_TOKEN is deleted and re-added only when configured so
 * one code path owns which credential the CLI sees.
 */

export function claudeChildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token;
  return env;
}

export function codexChildEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  return env;
}

export function hasStrayAnthropicKey(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  );
}

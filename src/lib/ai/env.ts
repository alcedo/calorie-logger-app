import { homedir } from "node:os";
import { join } from "node:path";
import { getSetting, SETTING_CLAUDE_OAUTH_TOKEN } from "../settings";

/**
 * Child environments for CLI subprocesses.
 *
 * Spawn replaces the entire env when `env` is set, so we copy process.env
 * then drop credentials that would silently switch billing to an API key.
 * CLAUDE_CODE_OAUTH_TOKEN is deleted and re-added only when configured so
 * one code path owns which credential the CLI sees.
 */

function withLocalBin(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const localBin = join(homedir(), ".local", "bin");
  const path = env.PATH ?? "";
  if (!path.split(":").includes(localBin)) {
    env.PATH = `${localBin}:${path}`;
  }
  return env;
}

/** Drop research/scratch homes that break Codex helper binaries. */
function dropScratchHomes(env: NodeJS.ProcessEnv): void {
  for (const key of ["CODEX_HOME", "CLAUDE_CONFIG_DIR"] as const) {
    const v = env[key];
    if (v && (v.startsWith("/tmp/") || v === "/tmp")) delete env[key];
  }
}

export function claudeBin(): string {
  return process.env.AI_CLAUDE_BIN || "claude";
}

export function codexBin(): string {
  return process.env.AI_CODEX_BIN || "codex";
}

export function claudeChildEnv(): NodeJS.ProcessEnv {
  const env = withLocalBin({ ...process.env });
  dropScratchHomes(env);
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.DISPLAY;
  env.BROWSER = "true";
  const token =
    process.env.CLAUDE_CODE_OAUTH_TOKEN ||
    getSetting(SETTING_CLAUDE_OAUTH_TOKEN);
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token;
  return env;
}

export function codexChildEnv(): NodeJS.ProcessEnv {
  const env = withLocalBin({ ...process.env });
  dropScratchHomes(env);
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  delete env.DISPLAY;
  env.BROWSER = "true";
  return env;
}

export function hasStrayAnthropicKey(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  );
}

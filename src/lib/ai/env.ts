import { existsSync } from "node:fs";
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
 *
 * TERM is forced to `dumb` because Claude Code emits OSC-8 hyperlinks when
 * TERM looks capable (e.g. tmux-256color from `next start` in tmux), even
 * if stdout is a pipe. Those sequences break naive "visit: https://" parsers.
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

const DROP_HOST_KEYS = [
  "DISPLAY",
  "CURSOR_AGENT",
  "CURSOR_AGENT_SOCKET",
  "CURSOR_CONVERSATION_ID",
  "CURSOR_RIPGREP_PATH",
  "AGENT_TRANSCRIPTS",
  "EXEC_DAEMON_STARTUP_TRACEPARENT",
  "TMUX",
  "TMUX_PANE",
] as const;

function sanitizeHostEnv(env: NodeJS.ProcessEnv): void {
  for (const key of DROP_HOST_KEYS) delete env[key];
  env.TERM = "dumb";
  env.NO_COLOR = "1";
  env.FORCE_COLOR = "0";
  env.COLOR = "0";
  env.BROWSER = "true";
}

function resolveBin(name: string, override: string | undefined): string {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  const local = join(homedir(), ".local", "bin", name);
  if (existsSync(local)) return local;
  return name;
}

export function claudeBin(): string {
  return resolveBin("claude", process.env.AI_CLAUDE_BIN);
}

export function codexBin(): string {
  return resolveBin("codex", process.env.AI_CODEX_BIN);
}

export function claudeChildEnv(): NodeJS.ProcessEnv {
  const env = withLocalBin({ ...process.env });
  dropScratchHomes(env);
  sanitizeHostEnv(env);
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  let stored: string | undefined;
  try {
    stored = getSetting(SETTING_CLAUDE_OAUTH_TOKEN);
  } catch {
    stored = undefined;
  }
  const token = process.env.CLAUDE_CODE_OAUTH_TOKEN || stored;
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  if (token) env.CLAUDE_CODE_OAUTH_TOKEN = token;
  return env;
}

export function codexChildEnv(): NodeJS.ProcessEnv {
  const env = withLocalBin({ ...process.env });
  dropScratchHomes(env);
  sanitizeHostEnv(env);
  delete env.OPENAI_API_KEY;
  delete env.CODEX_API_KEY;
  return env;
}

export function hasStrayAnthropicKey(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  );
}

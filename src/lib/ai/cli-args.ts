/**
 * Locked argv for Claude Code / Codex CLI. Tests snapshot these so a refactor
 * cannot reintroduce `--bare` (Claude) or `--ask-for-approval` (Codex exec).
 *
 * Measured against Claude Code 2.1.233 and Codex 0.147.0.
 */

export const CLAUDE_AUTH_STATUS_ARGS = ["auth", "status"] as const;
export const CLAUDE_AUTH_LOGIN_ARGS = ["auth", "login", "--claudeai"] as const;
export const CLAUDE_AUTH_LOGOUT_ARGS = ["auth", "logout"] as const;

export const CODEX_LOGIN_STATUS_ARGS = ["login", "status"] as const;
export const CODEX_DEVICE_LOGIN_ARGS = ["login", "--device-auth"] as const;
export const CODEX_LOGOUT_ARGS = ["logout"] as const;

export function claudeModelArgs(model: string | undefined): string[] {
  const trimmed = model?.trim();
  return trimmed ? ["--model", trimmed] : [];
}

export function codexModelArgs(model: string | undefined): string[] {
  const trimmed = model?.trim();
  return trimmed ? ["-m", trimmed] : [];
}

export function claudePrintArgs(opts: {
  schemaJson: string;
  system: string;
  model?: string;
}): string[] {
  return [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    opts.schemaJson,
    "--system-prompt",
    opts.system,
    "--tools",
    "",
    "--strict-mcp-config",
    "--max-turns",
    "2",
    "--no-session-persistence",
    ...claudeModelArgs(opts.model),
  ];
}

export function codexExecArgs(opts: {
  schemaPath: string;
  outPath: string;
  model?: string;
}): string[] {
  return [
    "exec",
    "-",
    "--output-schema",
    opts.schemaPath,
    "-o",
    opts.outPath,
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--ephemeral",
    "--color",
    "never",
    ...codexModelArgs(opts.model),
  ];
}

export function argsForbid(args: readonly string[], flag: string): boolean {
  return !args.includes(flag);
}

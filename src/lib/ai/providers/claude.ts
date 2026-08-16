import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { interpretClaudeAuthStatus, interpretClaudePrintResult } from "../claude-parse";
import { claudeBin, claudeChildEnv } from "../env";
import {
  CliError,
  PROBE_TIMEOUT_MS,
  cliTimeoutMs,
  runCli,
} from "../run-cli";
import type {
  AiProvider,
  GenerateJsonRequest,
  ProviderAvailability,
} from "../types";

function modelArgs(): string[] {
  const model = process.env.AI_CLAUDE_MODEL?.trim();
  return model ? ["--model", model] : [];
}

export const claudeProvider: AiProvider = {
  id: "claude",
  label: "Claude Code (subscription)",

  async isAvailable(): Promise<ProviderAvailability> {
    const env = claudeChildEnv();
    try {
      const result = await runCli({
        command: claudeBin(),
        args: ["auth", "status"],
        env,
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      if (!result.stdout.trim()) {
        if (result.exitCode !== 0) {
          return {
            available: false,
            detail:
              result.stderr.trim() ||
              "Not logged in. Run `claude auth login`.",
            reason: "missing",
          };
        }
        return {
          available: false,
          detail: "Could not parse `claude auth status` output.",
          reason: "error",
        };
      }
      return interpretClaudeAuthStatus(result.stdout);
    } catch (err) {
      if (err instanceof CliError && err.code === "ENOENT") {
        return {
          available: false,
          detail:
            "claude CLI not found on PATH. Install Claude Code, then run `claude auth login`.",
          reason: "missing",
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        detail: `claude auth status failed: ${message}`,
        reason: "error",
      };
    }
  },

  async generateJson<T>(req: GenerateJsonRequest): Promise<T> {
    const env = claudeChildEnv();
    const cwd = await mkdtemp(join(tmpdir(), "macro-claude-"));
    try {
      const result = await runCli({
        command: claudeBin(),
        args: [
          "-p",
          "--output-format",
          "json",
          "--json-schema",
          JSON.stringify(req.schema),
          "--system-prompt",
          req.system,
          "--tools",
          "",
          "--strict-mcp-config",
          "--max-turns",
          "2", // valid but hidden from `claude --help`; needed for schema retries
          "--no-session-persistence",
          ...modelArgs(),
        ],
        stdin: req.user,
        cwd,
        env,
        timeoutMs: cliTimeoutMs(),
      });

      const outcome = interpretClaudePrintResult(
        result.stdout,
        result.stderr,
        result.exitCode,
      );
      if (!outcome.ok) {
        const hint =
          outcome.terminalReason === "api_error" &&
          !/login/i.test(outcome.message)
            ? " Sign in with `claude auth login`."
            : "";
        throw new Error(outcome.message + hint);
      }
      return outcome.value as T;
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
};

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { interpretClaudeAuthStatus, interpretClaudePrintResult } from "../claude-parse";
import {
  CLAUDE_AUTH_STATUS_ARGS,
  claudePrintArgs,
} from "../cli-args";
import { claudeBin, claudeChildEnv } from "../env";
import {
  PROBE_TIMEOUT_MS,
  cliTimeoutMs,
  isCliNotFound,
  cliNotFoundMessage,
  cliIsInstalled,
  runCli,
} from "../run-cli";
import type {
  AiProvider,
  GenerateJsonRequest,
  ProviderAvailability,
} from "../types";
import { isServerlessHost, SERVERLESS_CLI_DETAIL } from "../../runtime";

export const claudeProvider: AiProvider = {
  id: "claude",
  label: "Claude Code (subscription)",

  async isAvailable(): Promise<ProviderAvailability> {
    if (isServerlessHost()) {
      return {
        available: false,
        detail: SERVERLESS_CLI_DETAIL,
        reason: "serverless",
        cliInstalled: false,
      };
    }
    const env = await claudeChildEnv();
    const command = claudeBin();
    if (!cliIsInstalled(command, env)) {
      return {
        available: false,
        detail: cliNotFoundMessage(command),
        reason: "missing",
        cliInstalled: false,
      };
    }
    try {
      const result = await runCli({
        command,
        args: [...CLAUDE_AUTH_STATUS_ARGS],
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
            cliInstalled: true,
          };
        }
        return {
          available: false,
          detail: "Could not parse `claude auth status` output.",
          reason: "error",
          cliInstalled: true,
        };
      }
      return { ...interpretClaudeAuthStatus(result.stdout), cliInstalled: true };
    } catch (err) {
      if (isCliNotFound(err)) {
        return {
          available: false,
          detail: cliNotFoundMessage(command),
          reason: "missing",
          cliInstalled: false,
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        detail: `claude auth status failed: ${message}`,
        reason: "error",
        cliInstalled: true,
      };
    }
  },

  async generateJson<T>(req: GenerateJsonRequest): Promise<T> {
    if (isServerlessHost()) {
      throw new Error(SERVERLESS_CLI_DETAIL);
    }
    const env = await claudeChildEnv();
    const cwd = await mkdtemp(join(tmpdir(), "macro-claude-"));
    try {
      const result = await runCli({
        command: claudeBin(),
        args: claudePrintArgs({
          schemaJson: JSON.stringify(req.schema),
          system: req.system,
          model: req.model ?? process.env.AI_CLAUDE_MODEL,
        }),
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
    } catch (err) {
      if (isCliNotFound(err)) {
        throw new Error(cliNotFoundMessage(claudeBin()));
      }
      throw err;
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
};

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CODEX_LOGIN_STATUS_ARGS,
  codexExecArgs,
} from "../cli-args";
import { codexBin, codexChildEnv } from "../env";
import {
  PROBE_TIMEOUT_MS,
  cliTimeoutMs,
  firstJsonObject,
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
import {
  persistCodexAuth,
  readCodexCredential,
  replaceRequestCodexAuth,
} from "../credentials";
import {
  generateJsonViaCodexHttp,
  refreshCodexTokens,
} from "../codex-http";
import { isServerlessHost } from "../../runtime";

function tokenAvailability(): ProviderAvailability | null {
  const cred = readCodexCredential();
  if (!cred) return null;
  return {
    available: true,
    detail: "ChatGPT subscription token",
    cliInstalled: false,
  };
}

export const codexProvider: AiProvider = {
  id: "codex",
  label: "Codex CLI (ChatGPT login)",

  async isAvailable(): Promise<ProviderAvailability> {
    if (isServerlessHost()) {
      return (
        tokenAvailability() ?? {
          available: false,
          detail:
            "Connect ChatGPT. Vercel cannot spawn the Codex CLI.",
          reason: "serverless",
          cliInstalled: false,
        }
      );
    }
    const token = tokenAvailability();
    if (token) return { ...token, cliInstalled: cliIsInstalled(codexBin(), codexChildEnv()) };
    const env = codexChildEnv();
    const command = codexBin();
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
        args: [...CODEX_LOGIN_STATUS_ARGS],
        env,
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      const text = (result.stdout + "\n" + result.stderr).trim();
      if (result.exitCode === 0) {
        return {
          available: true,
          detail: text || "Logged in",
          cliInstalled: true,
        };
      }
      return {
        available: false,
        detail: text || "Not logged in. Run `codex login`.",
        reason: "missing",
        cliInstalled: true,
      };
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
        detail: `codex login status failed: ${message}`,
        reason: "error",
        cliInstalled: true,
      };
    }
  },

  async generateJson<T>(req: GenerateJsonRequest): Promise<T> {
    const cred = readCodexCredential();
    if (cred) {
      try {
        return await generateJsonViaCodexHttp(cred, req);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!/401|invalid_auth|unauthorized/i.test(message)) throw err;
        const refreshed = await refreshCodexTokens(cred);
        persistCodexAuth(refreshed);
        replaceRequestCodexAuth(refreshed);
        return generateJsonViaCodexHttp(refreshed, req);
      }
    }
    if (isServerlessHost()) {
      throw new Error("Connect ChatGPT. Vercel cannot spawn the Codex CLI.");
    }
    const env = codexChildEnv();
    const cwd = await mkdtemp(join(tmpdir(), "macro-codex-"));
    const schemaPath = join(cwd, "schema.json");
    const outPath = join(cwd, "out.json");
    try {
      await writeFile(schemaPath, JSON.stringify(req.schema), "utf8");
      const prompt = `${req.system}\n\n${req.user}`;
      const result = await runCli({
        command: codexBin(),
        args: codexExecArgs({
          schemaPath,
          outPath,
          model: req.model ?? process.env.AI_CODEX_MODEL,
        }),
        stdin: prompt,
        cwd,
        env,
        timeoutMs: cliTimeoutMs(),
      });

      if (result.timedOut) {
        throw new Error(
          `codex exec timed out after ${cliTimeoutMs()}ms. Unauthenticated runs retry for ~16s; raise AI_CLI_TIMEOUT_MS if needed.`,
        );
      }

      try {
        const raw = await readFile(outPath, "utf8");
        return JSON.parse(raw) as T;
      } catch {
        const combined = (result.stdout + "\n" + result.stderr).trim();
        if (result.exitCode !== 0) {
          throw new Error(
            combined || `codex exec exited ${result.exitCode}`,
          );
        }
        try {
          return firstJsonObject(result.stdout) as T;
        } catch {
          throw new Error(
            combined || "codex exec produced no JSON output",
          );
        }
      }
    } catch (err) {
      if (isCliNotFound(err)) {
        throw new Error(cliNotFoundMessage(codexBin()));
      }
      throw err;
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
};

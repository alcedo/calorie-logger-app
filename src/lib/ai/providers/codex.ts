import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexBin, codexChildEnv } from "../env";
import {
  CliError,
  PROBE_TIMEOUT_MS,
  cliTimeoutMs,
  firstJsonObject,
  runCli,
} from "../run-cli";
import type {
  AiProvider,
  GenerateJsonRequest,
  ProviderAvailability,
} from "../types";

function modelArgs(): string[] {
  const model = process.env.AI_CODEX_MODEL?.trim();
  return model ? ["-m", model] : [];
}

export const codexProvider: AiProvider = {
  id: "codex",
  label: "Codex CLI (ChatGPT login)",

  async isAvailable(): Promise<ProviderAvailability> {
    const env = codexChildEnv();
    try {
      const result = await runCli({
        command: codexBin(),
        args: ["login", "status"],
        env,
        timeoutMs: PROBE_TIMEOUT_MS,
      });
      const text = (result.stdout + "\n" + result.stderr).trim();
      if (result.exitCode === 0) {
        return {
          available: true,
          detail: text || "Logged in",
        };
      }
      return {
        available: false,
        detail: text || "Not logged in. Run `codex login`.",
        reason: "missing",
      };
    } catch (err) {
      if (err instanceof CliError && err.code === "ENOENT") {
        return {
          available: false,
          detail:
            "codex CLI not found on PATH. Install Codex, then run `codex login`.",
          reason: "missing",
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        detail: `codex login status failed: ${message}`,
        reason: "error",
      };
    }
  },

  async generateJson<T>(req: GenerateJsonRequest): Promise<T> {
    const env = codexChildEnv();
    const cwd = await mkdtemp(join(tmpdir(), "macro-codex-"));
    const schemaPath = join(cwd, "schema.json");
    const outPath = join(cwd, "out.json");
    try {
      await writeFile(schemaPath, JSON.stringify(req.schema), "utf8");
      const prompt = `${req.system}\n\n${req.user}`;
      const result = await runCli({
        command: codexBin(),
        args: [
          "exec",
          "-",
          "--output-schema",
          schemaPath,
          "-o",
          outPath,
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--ephemeral",
          "--color",
          "never",
          ...modelArgs(),
        ],
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
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  },
};

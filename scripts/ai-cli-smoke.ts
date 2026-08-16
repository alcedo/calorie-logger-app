/**
 * Unauthenticated CLI smoke checks. Does not require a login.
 *
 *   npx tsx scripts/ai-cli-smoke.ts
 *
 * Installs CLIs into /tmp/macro-cli-smoke if they are not already on PATH.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { interpretClaudePrintResult } from "../src/lib/ai/claude-parse";

const PREFIX = "/tmp/macro-cli-smoke";

function run(
  command: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; stdin?: string; timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: opts.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timeout: ${command} ${args.join(" ")}`));
    }, opts.timeoutMs ?? 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr.on("data", (c: string) => {
      stderr += c;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code });
    });
    if (opts.stdin) child.stdin.write(opts.stdin);
    child.stdin.end();
  });
}

function which(bin: string): string | null {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    const p = join(dir, bin);
    if (existsSync(p)) return p;
  }
  const local = join(PREFIX, "node_modules", ".bin", bin);
  return existsSync(local) ? local : null;
}

async function npmInstallLocal() {
  mkdirSync(PREFIX, { recursive: true });
  console.log("Installing CLIs into", PREFIX);
  const result = await new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }>((resolve, reject) => {
    const child = spawn(
      "npm",
      ["install", "@anthropic-ai/claude-code@2.1.233", "@openai/codex"],
      { cwd: PREFIX, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => {
      stdout += c;
    });
    child.stderr.on("data", (c: string) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, exitCode: code }));
  });
  if (result.exitCode !== 0) {
    throw new Error(`npm install failed: ${result.stderr || result.stdout}`);
  }
}

function assert(cond: unknown, message: string) {
  if (!cond) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("ok ", message);
}

async function main() {
  if (!which("claude") || !which("codex")) {
    await npmInstallLocal();
  }
  const claude = which("claude");
  const codex = which("codex");
  assert(claude && existsSync(claude), `claude binary at ${claude}`);
  assert(codex && existsSync(codex), `codex binary at ${codex}`);

  const scratchClaude = join(PREFIX, "claude-home");
  const scratchCodex = join(PREFIX, "codex-home");
  mkdirSync(scratchClaude, { recursive: true });
  mkdirSync(scratchCodex, { recursive: true });

  const cleanEnv: NodeJS.ProcessEnv = {
    ...process.env,
    CLAUDE_CONFIG_DIR: scratchClaude,
    CODEX_HOME: scratchCodex,
  };
  delete cleanEnv.ANTHROPIC_API_KEY;
  delete cleanEnv.ANTHROPIC_AUTH_TOKEN;
  delete cleanEnv.CLAUDE_CODE_OAUTH_TOKEN;
  delete cleanEnv.OPENAI_API_KEY;
  delete cleanEnv.CODEX_API_KEY;

  console.log("\n== codex exec rejects --ask-for-approval ==");
  const ask = await run(
    codex!,
    ["exec", "--ask-for-approval", "never", "--skip-git-repo-check", "hi"],
    { env: cleanEnv, timeoutMs: 20_000 },
  );
  assert(ask.exitCode === 2, `exit 2, got ${ask.exitCode}`);
  assert(
    /unexpected argument '--ask-for-approval'/i.test(ask.stderr + ask.stdout),
    "error names --ask-for-approval",
  );

  console.log("\n== claude -p --max-turns 2 is accepted ==");
  const maxTurns = await run(
    claude!,
    ["-p", "--max-turns", "2", "--output-format", "json"],
    { env: cleanEnv, stdin: "hi", timeoutMs: 20_000 },
  );
  assert(
    !/unknown option/i.test(maxTurns.stderr + maxTurns.stdout),
    "--max-turns is not rejected as unknown",
  );

  console.log("\n== unauthenticated claude -p payload ==");
  const print = await run(
    claude!,
    ["-p", "--output-format", "json", "--max-turns", "1"],
    { env: cleanEnv, stdin: "say hi", timeoutMs: 20_000 },
  );
  const outcome = interpretClaudePrintResult(
    print.stdout,
    print.stderr,
    print.exitCode,
  );
  assert(!outcome.ok, "unauthenticated run is a failure");
  assert(print.exitCode === 1, `exit 1, got ${print.exitCode}`);
  const payload = JSON.parse(print.stdout.slice(print.stdout.indexOf("{")));
  assert(payload.is_error === true, "is_error true");
  assert(payload.subtype === "success", "subtype success (must not be trusted)");
  assert(
    !("structured_output" in payload) || payload.structured_output == null,
    "no structured_output",
  );
  console.log("All CLI smoke checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

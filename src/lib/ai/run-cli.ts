import { spawn } from "node:child_process";

export const DEFAULT_CLI_TIMEOUT_MS = 60_000;
export const MIN_CLI_TIMEOUT_MS = 20_000;
export const PROBE_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export class CliError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly args: string[],
    readonly exitCode: number | null,
    readonly stdout: string,
    readonly stderr: string,
    readonly timedOut: boolean,
    readonly code?: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export function isCliNotFound(err: unknown): boolean {
  if (err == null) return false;
  if (typeof err === "object") {
    const e = err as { code?: string; message?: string };
    if (e.code === "ENOENT") return true;
    if (typeof e.message === "string" && /ENOENT/i.test(e.message)) return true;
  }
  return /ENOENT/i.test(String(err));
}

export function cliNotFoundMessage(command: string): string {
  const base = command.split(/[/\\]/).pop() || command;
  if (/codex/i.test(base) || /codex/i.test(command)) {
    return "codex CLI not found on PATH. Install Codex, then connect ChatGPT again.";
  }
  if (/claude/i.test(base) || /claude/i.test(command)) {
    return "claude CLI not found on PATH. Install Claude Code, then connect Claude again.";
  }
  return `${base} not found on PATH.`;
}

/** User-facing CLI error. Never leak raw `spawn … ENOENT` from Node. */
export function publicCliErrorMessage(err: unknown, commandHint = ""): string {
  const message = err instanceof Error ? err.message : String(err);
  if (isCliNotFound(err) || /spawn\s+\S+\s+ENOENT/i.test(message)) {
    const fromSpawn = message.match(/spawn\s+(\S+)\s+ENOENT/i)?.[1];
    const fromCli =
      err instanceof CliError && err.command ? err.command : undefined;
    return cliNotFoundMessage(fromCli || fromSpawn || commandHint || message);
  }
  return message;
}

export function cliTimeoutMs(): number {
  const raw = process.env.AI_CLI_TIMEOUT_MS;
  if (!raw) return DEFAULT_CLI_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_CLI_TIMEOUT_MS;
  return Math.max(MIN_CLI_TIMEOUT_MS, Math.floor(n));
}

export interface RunCliOptions {
  command: string;
  args: string[];
  stdin?: string;
  cwd?: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
  maxBuffer?: number;
}

export interface RunCliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export function runCli(opts: RunCliOptions): Promise<RunCliResult> {
  const timeoutMs = opts.timeoutMs ?? cliTimeoutMs();
  const maxBuffer = opts.maxBuffer ?? DEFAULT_MAX_BUFFER;

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let child;

    try {
      child = spawn(opts.command, opts.args, {
        cwd: opts.cwd,
        env: opts.env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      reject(
        new CliError(
          e.code === "ENOENT"
            ? `${opts.command} not found on PATH`
            : e.message,
          opts.command,
          opts.args,
          null,
          "",
          "",
          false,
          e.code,
        ),
      );
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!settled) child.kill("SIGKILL");
      }, 2000).unref();
    }, timeoutMs);

    const overflow = (stream: "stdout" | "stderr") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill("SIGKILL");
      reject(
        new CliError(
          `${opts.command} ${stream} exceeded ${maxBuffer} bytes`,
          opts.command,
          opts.args,
          null,
          stdout,
          stderr,
          false,
        ),
      );
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (stdout.length > maxBuffer) overflow("stdout");
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > maxBuffer) overflow("stderr");
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new CliError(
          err.code === "ENOENT"
            ? `${opts.command} not found on PATH`
            : err.message,
          opts.command,
          opts.args,
          null,
          stdout,
          stderr,
          false,
          err.code,
        ),
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        timedOut,
      });
    });

    try {
      if (opts.stdin != null) {
        child.stdin.write(opts.stdin);
      }
      child.stdin.end();
    } catch {
      // Process already exited (e.g. ENOENT).
    }
  });
}

export function firstJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty output");
  const start = trimmed.indexOf("{");
  if (start < 0) throw new Error("no JSON object in output");
  return JSON.parse(trimmed.slice(start));
}

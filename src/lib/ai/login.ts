import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { claudeBin, claudeChildEnv, codexBin, codexChildEnv } from "./env";
import { parseClaudeLoginOutput, parseCodexDeviceAuthOutput } from "./login-parse";

export type LoginKind = "claude" | "codex";

export interface LoginSessionPublic {
  sessionId: string;
  provider: LoginKind;
  loginUrl: string;
  userCode?: string;
  expiresAt: number;
  phase: "awaiting_user" | "completing" | "done" | "failed";
  error?: string;
}

interface LoginSession {
  public: LoginSessionPublic;
  child: ChildProcess;
  exitCode: number | null;
  closed: Promise<number | null>;
}

const CLAUDE_TTL_MS = 10 * 60 * 1000;
const CODEX_TTL_MS = 15 * 60 * 1000;
const START_WAIT_MS = 20_000;

type Store = Map<string, LoginSession>;

const g = globalThis as unknown as { __macroAiLogins?: Store };

function store(): Store {
  if (!g.__macroAiLogins) g.__macroAiLogins = new Map();
  return g.__macroAiLogins;
}

function killChild(child: ChildProcess) {
  try {
    child.kill("SIGTERM");
  } catch {
    /* already gone */
  }
  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }, 1500).unref();
}

function killSession(session: LoginSession) {
  killChild(session.child);
}

function cancelProvider(provider: LoginKind) {
  for (const [id, session] of store()) {
    if (session.public.provider === provider) {
      killSession(session);
      store().delete(id);
    }
  }
}

function attach(child: ChildProcess): {
  sessionBuf: { current: string };
  closed: Promise<number | null>;
} {
  const sessionBuf = { current: "" };
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  const onChunk = (chunk: string) => {
    sessionBuf.current += chunk;
  };
  child.stdout?.on("data", onChunk);
  child.stderr?.on("data", onChunk);
  child.stdout?.resume();
  child.stderr?.resume();
  const closed = new Promise<number | null>((resolve) => {
    child.on("close", (code) => resolve(code));
    child.on("error", () => resolve(null));
  });
  return { sessionBuf, closed };
}

function spawnLogin(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): ChildProcess {
  return spawn(command, args, {
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
}

function waitFor(
  sessionBuf: { current: string },
  child: ChildProcess,
  parse: (text: string) => unknown,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const snippet = sessionBuf.current.trim().slice(0, 400);
      reject(
        new Error(
          snippet
            ? `Timed out waiting for the login URL.\n${snippet}`
            : "Timed out waiting for the login URL. Is the CLI installed?",
        ),
      );
    }, timeoutMs);

    const check = () => {
      if (parse(sessionBuf.current)) {
        clearTimeout(timer);
        resolve();
        return true;
      }
      return false;
    };
    if (check()) return;

    const onData = () => {
      if (check()) {
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      if (parse(sessionBuf.current)) return;
      clearTimeout(timer);
      reject(
        new Error(
          `Login process exited ${code} before printing a URL.\n${sessionBuf.current.trim()}`,
        ),
      );
    });
  });
}

async function spawnUntilParsed(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  parse: (text: string) => unknown,
): Promise<{
  child: ChildProcess;
  sessionBuf: { current: string };
  closed: Promise<number | null>;
}> {
  const child = spawnLogin(command, args, env);
  const { sessionBuf, closed } = attach(child);
  try {
    await waitFor(sessionBuf, child, parse, START_WAIT_MS);
  } catch (err) {
    killChild(child);
    throw err;
  }
  return { child, sessionBuf, closed };
}

export async function startClaudeLogin(): Promise<LoginSessionPublic> {
  cancelProvider("claude");
  const { child, sessionBuf, closed } = await spawnUntilParsed(
    claudeBin(),
    ["auth", "login", "--claudeai"],
    claudeChildEnv(),
    parseClaudeLoginOutput,
  );
  const parsed = parseClaudeLoginOutput(sessionBuf.current);
  if (!parsed) {
    killChild(child);
    throw new Error("Claude login did not print a URL");
  }

  const sessionId = randomUUID();
  const session: LoginSession = {
    public: {
      sessionId,
      provider: "claude",
      loginUrl: parsed.loginUrl,
      expiresAt: Date.now() + CLAUDE_TTL_MS,
      phase: "awaiting_user",
    },
    child,
    exitCode: null,
    closed,
  };
  closed.then((code) => {
    session.exitCode = code;
    if (session.public.phase === "awaiting_user") {
      session.public.phase = "failed";
      session.public.error = "Login cancelled or expired.";
    }
  });
  store().set(sessionId, session);
  setTimeout(() => {
    const current = store().get(sessionId);
    if (current && current.public.phase === "awaiting_user") {
      current.public.phase = "failed";
      current.public.error = "Login timed out. Try connecting again.";
      killSession(current);
      store().delete(sessionId);
    }
  }, CLAUDE_TTL_MS).unref();
  return session.public;
}

export async function completeClaudeLogin(
  sessionId: string,
  code: string,
): Promise<LoginSessionPublic> {
  const session = store().get(sessionId);
  if (!session || session.public.provider !== "claude") {
    throw new Error("No active Claude login. Tap Connect again.");
  }
  if (session.public.phase !== "awaiting_user") {
    throw new Error("This Claude login is no longer waiting for a code.");
  }
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Paste the code from the Claude login page.");
  session.public.phase = "completing";
  try {
    session.child.stdin?.write(trimmed + "\n");
    session.child.stdin?.end();
  } catch {
    throw new Error("Could not send the code to Claude Code. Try connecting again.");
  }
  const exit = await Promise.race([
    session.closed,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 60_000)),
  ]);
  if (exit === null && session.exitCode === null) {
    session.public.phase = "failed";
    session.public.error = "Claude Code did not finish login in time.";
    killSession(session);
    store().delete(sessionId);
    throw new Error(session.public.error);
  }
  const codeNum = session.exitCode ?? exit;
  if (codeNum !== 0) {
    session.public.phase = "failed";
    session.public.error =
      "Claude login failed. The code may have expired — try connecting again.";
    store().delete(sessionId);
    throw new Error(session.public.error);
  }
  session.public.phase = "done";
  store().delete(sessionId);
  return session.public;
}

export async function startCodexLogin(): Promise<LoginSessionPublic> {
  cancelProvider("codex");
  const { child, sessionBuf, closed } = await spawnUntilParsed(
    codexBin(),
    ["login", "--device-auth"],
    codexChildEnv(),
    parseCodexDeviceAuthOutput,
  );
  const parsed = parseCodexDeviceAuthOutput(sessionBuf.current);
  if (!parsed) {
    killChild(child);
    throw new Error("Codex login did not print a device code");
  }

  const sessionId = randomUUID();
  const session: LoginSession = {
    public: {
      sessionId,
      provider: "codex",
      loginUrl: parsed.loginUrl,
      userCode: parsed.userCode,
      expiresAt: Date.now() + CODEX_TTL_MS,
      phase: "awaiting_user",
    },
    child,
    exitCode: null,
    closed,
  };
  closed.then((code) => {
    session.exitCode = code;
    if (session.public.phase === "awaiting_user" || session.public.phase === "completing") {
      if (code === 0) {
        session.public.phase = "done";
      } else {
        session.public.phase = "failed";
        session.public.error = "ChatGPT login did not complete. Try connecting again.";
      }
    }
  });
  store().set(sessionId, session);
  setTimeout(() => {
    const current = store().get(sessionId);
    if (
      current &&
      (current.public.phase === "awaiting_user" || current.public.phase === "completing")
    ) {
      current.public.phase = "failed";
      current.public.error = "Login timed out. Try connecting again.";
      killSession(current);
      store().delete(sessionId);
    }
  }, CODEX_TTL_MS).unref();
  return session.public;
}

export function getLogin(sessionId: string): LoginSessionPublic | undefined {
  const session = store().get(sessionId);
  if (!session) return undefined;
  if (session.public.phase === "done") {
    store().delete(sessionId);
  }
  return session.public;
}

export function activeLogins(): LoginSessionPublic[] {
  return [...store().values()].map((s) => s.public);
}

export function cancelLogin(sessionId: string): void {
  const session = store().get(sessionId);
  if (!session) return;
  killSession(session);
  store().delete(sessionId);
}

export async function logoutProvider(provider: LoginKind): Promise<void> {
  cancelProvider(provider);
  const { runCli, PROBE_TIMEOUT_MS } = await import("./run-cli");
  if (provider === "claude") {
    await runCli({
      command: claudeBin(),
      args: ["auth", "logout"],
      env: claudeChildEnv(),
      timeoutMs: PROBE_TIMEOUT_MS,
    }).catch(() => undefined);
  } else {
    await runCli({
      command: codexBin(),
      args: ["logout"],
      env: codexChildEnv(),
      timeoutMs: PROBE_TIMEOUT_MS,
    }).catch(() => undefined);
  }
}

import assert from "node:assert/strict";
import { chmodSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  activeLogins,
  cancelLogin,
  completeClaudeLogin,
  startClaudeLogin,
  startCodexLogin,
} from "./login";

const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));
const fakeClaude = join(fixtures, "fake-claude-login.mjs");
const fakeCodex = join(fixtures, "fake-codex-login.mjs");
const fakeSilent = join(fixtures, "fake-silent-cli.mjs");

const saved: Record<string, string | undefined> = {};
const ENV_KEYS = [
  "AI_CLAUDE_BIN",
  "AI_CODEX_BIN",
  "AI_LOGIN_START_WAIT_MS",
  "MACRO_TEST_ENV_DUMP",
  "ANTHROPIC_API_KEY",
  "DISPLAY",
  "TERM",
  "TMUX",
] as const;

function stashEnv() {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("login sessions against fake CLIs", () => {
  beforeAll(() => {
    chmodSync(fakeClaude, 0o755);
    chmodSync(fakeCodex, 0o755);
    chmodSync(fakeSilent, 0o755);
  });

  afterEach(() => {
    restoreEnv();
    for (const login of activeLogins()) {
      cancelLogin(login.sessionId);
    }
  });

  it("extracts a Claude authorize URL from OSC-8 output and completes on a code", async () => {
    stashEnv();
    const dump = join(tmpdir(), `macro-claude-env-${Date.now()}.json`);
    process.env.AI_CLAUDE_BIN = fakeClaude;
    process.env.AI_LOGIN_START_WAIT_MS = "2000";
    process.env.MACRO_TEST_ENV_DUMP = dump;
    process.env.ANTHROPIC_API_KEY = "sk-ant-api-must-not-leak";
    process.env.DISPLAY = ":1";
    process.env.TERM = "tmux-256color";
    process.env.TMUX = "1";

    const login = await startClaudeLogin();
    try {
      assert.equal(login.provider, "claude");
      assert.equal(login.phase, "awaiting_user");
      assert.match(login.loginUrl, /claude\.com\/cai\/oauth\/authorize/);

      const dumped = JSON.parse(readFileSync(dump, "utf8")) as Record<
        string,
        string | null
      >;
      assert.equal(dumped.TERM, "dumb");
      assert.equal(dumped.ANTHROPIC_API_KEY, null);
      assert.equal(dumped.DISPLAY, null);
      assert.equal(dumped.TMUX, null);
      assert.equal(dumped.BROWSER, "true");

      const done = await completeClaudeLogin(login.sessionId, "good-code");
      assert.equal(done.phase, "done");
    } finally {
      cancelLogin(login.sessionId);
      try {
        unlinkSync(dump);
      } catch {
        /* ignore */
      }
    }
  });

  it("extracts Codex device URL and one-time code", async () => {
    stashEnv();
    process.env.AI_CODEX_BIN = fakeCodex;
    process.env.AI_LOGIN_START_WAIT_MS = "2000";
    const login = await startCodexLogin();
    try {
      assert.equal(login.provider, "codex");
      assert.equal(login.loginUrl, "https://auth.openai.com/codex/device");
      assert.equal(login.userCode, "UBN6-U35TZ");
      assert.equal(login.phase, "awaiting_user");
    } finally {
      cancelLogin(login.sessionId);
    }
  });

  it("times out and kills a CLI that never prints a URL", async () => {
    stashEnv();
    process.env.AI_CLAUDE_BIN = fakeSilent;
    process.env.AI_LOGIN_START_WAIT_MS = "400";
    await assert.rejects(
      () => startClaudeLogin(),
      /Timed out waiting for the login URL/,
    );
  });

  it("maps a missing Codex binary to a readable error (not spawn ENOENT)", async () => {
    stashEnv();
    process.env.AI_CODEX_BIN = "/no/such/macro-codex-binary";
    process.env.AI_LOGIN_START_WAIT_MS = "20000";
    const started = Date.now();
    await assert.rejects(() => startCodexLogin(), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /codex CLI not found/i);
      assert.doesNotMatch(err.message, /spawn /i);
      assert.doesNotMatch(err.message, /ENOENT/);
      return true;
    });
    assert.ok(
      Date.now() - started < 2000,
      "missing CLI must fail in preflight, not after spawn timeout",
    );
  });

  it("maps a missing Claude binary to a readable error (not spawn ENOENT)", async () => {
    stashEnv();
    process.env.AI_CLAUDE_BIN = "/no/such/macro-claude-binary";
    process.env.AI_LOGIN_START_WAIT_MS = "20000";
    const started = Date.now();
    await assert.rejects(() => startClaudeLogin(), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /claude CLI not found/i);
      assert.doesNotMatch(err.message, /spawn /i);
      assert.doesNotMatch(err.message, /ENOENT/);
      return true;
    });
    assert.ok(
      Date.now() - started < 2000,
      "missing CLI must fail in preflight, not after spawn timeout",
    );
  });
});

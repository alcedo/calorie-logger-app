import assert from "node:assert/strict";
import { chmodSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  activeLogins,
  cancelLogin,
  completeClaudeLogin,
  pollLogin,
  restoreCodexHttpLogin,
  startClaudeLogin,
  startCodexLogin,
} from "./login";
import { SERVERLESS_CONNECT_ERROR } from "../runtime";
import { setupTempDatabase } from "@/test/helpers";
import { readCodexCredential } from "./credentials";

setupTempDatabase();

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
  "VERCEL",
] as const;

function stashEnv() {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  delete process.env.VERCEL;
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
      rmSync(dump, { force: true });
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

  it("refuses Claude login on Vercel without spawning", async () => {
    stashEnv();
    process.env.VERCEL = "1";
    process.env.AI_CLAUDE_BIN = fakeClaude;
    process.env.AI_LOGIN_START_WAIT_MS = "2000";
    await assert.rejects(
      () => startClaudeLogin(),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message, SERVERLESS_CONNECT_ERROR);
        return true;
      },
    );
    assert.equal(activeLogins().length, 0);
  });

  it("starts ChatGPT device login on Vercel over HTTP", async () => {
    stashEnv();
    process.env.VERCEL = "1";
    process.env.AI_CODEX_BIN = fakeCodex;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          device_auth_id: "dev-1",
          user_code: "ABC-DEFG",
          interval: 30,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )) as typeof fetch;
    try {
      const login = await startCodexLogin();
      assert.equal(login.provider, "codex");
      assert.equal(login.userCode, "ABC-DEFG");
      assert.equal(login.loginUrl, "https://auth.openai.com/codex/device");
      cancelLogin(login.sessionId);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("advances a ChatGPT HTTP login when the client polls", async () => {
    stashEnv();
    process.env.VERCEL = "1";
    const originalFetch = globalThis.fetch;
    let step = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.includes("/usercode")) {
        return new Response(
          JSON.stringify({
            device_auth_id: "dev-poll",
            user_code: "POLL-CODE",
            interval: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/deviceauth/token")) {
        step += 1;
        if (step === 1) {
          return new Response(
            JSON.stringify({ error: "deviceauth_authorization_pending" }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            authorization_code: "auth-code",
            code_verifier: "verifier",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.includes("/oauth/token")) {
        return new Response(
          JSON.stringify({
            access_token: "access-from-poll",
            refresh_token: "refresh-from-poll",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;
    try {
      const login = await startCodexLogin();
      const pending = await pollLogin(login.sessionId);
      assert.equal(pending?.phase, "awaiting_user");
      const done = await pollLogin(login.sessionId);
      assert.equal(done?.phase, "done");
      assert.equal(readCodexCredential()?.accessToken, "access-from-poll");
      assert.equal(activeLogins().length, 0);
      const { clearCodexAuth } = await import("./credentials");
      clearCodexAuth();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("revives a ChatGPT HTTP login from stored device state", async () => {
    stashEnv();
    process.env.VERCEL = "1";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ error: "deviceauth_authorization_pending" }),
        { status: 400, headers: { "content-type": "application/json" } },
      )) as typeof fetch;
    try {
      const restored = restoreCodexHttpLogin({
        sessionId: "revived-session",
        deviceAuthId: "dev-revived",
        userCode: "REVIVE",
        expiresAt: Date.now() + 60_000,
      });
      assert.equal(restored?.userCode, "REVIVE");
      const pending = await pollLogin("revived-session");
      assert.equal(pending?.phase, "awaiting_user");
      cancelLogin("revived-session");
    } finally {
      globalThis.fetch = originalFetch;
    }
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

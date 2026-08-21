import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";
import { claudeChildEnv, codexChildEnv, hasStrayAnthropicKey } from "./env";

vi.mock("../settings", () => ({
  SETTING_CLAUDE_OAUTH_TOKEN: "claude_oauth_token",
  getSetting: async () => undefined,
}));

const KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_OAUTH_TOKEN",
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "DISPLAY",
  "TERM",
  "TMUX",
  "TMUX_PANE",
  "BROWSER",
  "CODEX_HOME",
  "CLAUDE_CONFIG_DIR",
  "CURSOR_AGENT",
] as const;

const saved: Record<string, string | undefined> = {};

function stash() {
  for (const key of KEYS) saved[key] = process.env[key];
}

function restore() {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("claudeChildEnv", () => {
  afterEach(restore);

  it("strips Anthropic API keys and forces a dumb terminal", async () => {
    stash();
    process.env.ANTHROPIC_API_KEY = "sk-ant-api-test";
    process.env.ANTHROPIC_AUTH_TOKEN = "sk-ant-oat-test";
    process.env.DISPLAY = ":1";
    process.env.TERM = "tmux-256color";
    process.env.TMUX = "1";
    process.env.CURSOR_AGENT = "1";
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;

    const env = await claudeChildEnv();
    assert.equal(env.ANTHROPIC_API_KEY, undefined);
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, undefined);
    assert.equal(env.DISPLAY, undefined);
    assert.equal(env.TMUX, undefined);
    assert.equal(env.CURSOR_AGENT, undefined);
    assert.equal(env.TERM, "dumb");
    assert.equal(env.BROWSER, "true");
    assert.equal(env.NO_COLOR, "1");
    assert.ok(hasStrayAnthropicKey());
  });

  it("passes through CLAUDE_CODE_OAUTH_TOKEN after dropping API keys", async () => {
    stash();
    process.env.ANTHROPIC_API_KEY = "sk-ant-api-test";
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat-keep";
    const env = await claudeChildEnv();
    assert.equal(env.ANTHROPIC_API_KEY, undefined);
    assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, "sk-ant-oat-keep");
  });

  it("drops scratch CODEX_HOME / CLAUDE_CONFIG_DIR under /tmp", async () => {
    stash();
    process.env.CODEX_HOME = "/tmp/clitest/codexhome";
    process.env.CLAUDE_CONFIG_DIR = "/tmp/claude";
    const env = await claudeChildEnv();
    assert.equal(env.CODEX_HOME, undefined);
    assert.equal(env.CLAUDE_CONFIG_DIR, undefined);
  });
});

describe("codexChildEnv", () => {
  afterEach(restore);

  it("strips OpenAI API keys so device-auth uses the ChatGPT login", () => {
    stash();
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.CODEX_API_KEY = "sk-test-2";
    process.env.TERM = "xterm-256color";
    const env = codexChildEnv();
    assert.equal(env.OPENAI_API_KEY, undefined);
    assert.equal(env.CODEX_API_KEY, undefined);
    assert.equal(env.TERM, "dumb");
  });
});

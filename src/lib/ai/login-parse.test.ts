import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  parseClaudeLoginOutput,
  parseCodexDeviceAuthOutput,
} from "./login-parse";
import {
  CLAUDE_LOGIN_OSC8,
  CLAUDE_LOGIN_OSC8_URL,
  CLAUDE_LOGIN_PLAIN,
  CODEX_DEVICE_AUTH_ANSI,
  CODEX_DEVICE_AUTH_OSC8_CR,
} from "./fixtures/cli-output";

describe("parseClaudeLoginOutput", () => {
  it("parses a plain visit: https URL", () => {
    const parsed = parseClaudeLoginOutput(CLAUDE_LOGIN_PLAIN);
    assert.ok(parsed);
    assert.ok(parsed.loginUrl.includes("claude.com/cai/oauth/authorize"));
    assert.ok(parsed.loginUrl.startsWith("https://"));
  });

  it("parses OSC-8 hyperlinks emitted under tmux TERM", () => {
    const parsed = parseClaudeLoginOutput(CLAUDE_LOGIN_OSC8);
    assert.equal(parsed?.loginUrl, CLAUDE_LOGIN_OSC8_URL);
  });

  it("returns null when there is no authorize URL", () => {
    assert.equal(parseClaudeLoginOutput("Paste code here if prompted >"), null);
  });
});

describe("parseCodexDeviceAuthOutput", () => {
  it("parses ANSI-colored device URL and code", () => {
    const parsed = parseCodexDeviceAuthOutput(CODEX_DEVICE_AUTH_ANSI);
    assert.equal(parsed?.loginUrl, "https://auth.openai.com/codex/device");
    assert.equal(parsed?.userCode, "UBN6-U35TZ");
  });

  it("parses OSC-8 URL plus CR line endings", () => {
    const parsed = parseCodexDeviceAuthOutput(CODEX_DEVICE_AUTH_OSC8_CR);
    assert.equal(parsed?.loginUrl, "https://auth.openai.com/codex/device");
    assert.equal(parsed?.userCode, "UCSZ-GZ4P1");
  });

  it("returns null without a one-time code", () => {
    assert.equal(
      parseCodexDeviceAuthOutput("https://auth.openai.com/codex/device"),
      null,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  interpretClaudeAuthStatus,
  interpretClaudePrintResult,
} from "./claude-parse";
import { CLAUDE_PRINT_UNAUTHENTICATED } from "./fixtures/cli-output";

describe("interpretClaudePrintResult", () => {
  it("treats is_error + subtype:success as failure (Claude Code 2.1.233)", () => {
    const outcome = interpretClaudePrintResult(
      CLAUDE_PRINT_UNAUTHENTICATED,
      "",
      1,
    );
    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.match(outcome.message, /login/i);
    assert.equal(outcome.terminalReason, "api_error");
  });

  it("rejects subtype:success without structured_output", () => {
    const outcome = interpretClaudePrintResult(
      JSON.stringify({ is_error: false, subtype: "success" }),
      "",
      0,
    );
    assert.equal(outcome.ok, false);
  });

  it("accepts structured_output even when subtype is success", () => {
    const outcome = interpretClaudePrintResult(
      JSON.stringify({
        is_error: false,
        subtype: "success",
        structured_output: { items: [{ name: "egg" }] },
      }),
      "",
      0,
    );
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.deepEqual(outcome.value, { items: [{ name: "egg" }] });
  });

  it("parses structured_output when it is a JSON string", () => {
    const outcome = interpretClaudePrintResult(
      JSON.stringify({
        is_error: false,
        structured_output: JSON.stringify({ n: 1 }),
      }),
      "",
      0,
    );
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.deepEqual(outcome.value, { n: 1 });
  });
});

describe("interpretClaudeAuthStatus", () => {
  it("rejects loggedIn:false", () => {
    const avail = interpretClaudeAuthStatus(
      JSON.stringify({ loggedIn: false, authMethod: "none" }),
    );
    assert.equal(avail.available, false);
    assert.equal(avail.reason, "missing");
  });

  it("rejects authMethod api_key", () => {
    const avail = interpretClaudeAuthStatus(
      JSON.stringify({
        loggedIn: true,
        authMethod: "api_key",
        apiKeySource: "ANTHROPIC_API_KEY",
      }),
    );
    assert.equal(avail.available, false);
    assert.equal(avail.reason, "api_key");
  });

  it("rejects claude.ai displaced by an API key source", () => {
    const avail = interpretClaudeAuthStatus(
      JSON.stringify({
        loggedIn: true,
        authMethod: "claude.ai",
        apiKeySource: "ANTHROPIC_API_KEY",
        subscriptionType: null,
      }),
    );
    assert.equal(avail.available, false);
    assert.equal(avail.reason, "api_key");
  });

  it("rejects claude.ai with null subscriptionType (stray-key tell)", () => {
    const avail = interpretClaudeAuthStatus(
      JSON.stringify({
        loggedIn: true,
        authMethod: "claude.ai",
        subscriptionType: null,
      }),
    );
    assert.equal(avail.available, false);
    assert.equal(avail.reason, "api_key");
  });

  it("accepts claude.ai + max subscription", () => {
    const avail = interpretClaudeAuthStatus(
      JSON.stringify({
        loggedIn: true,
        authMethod: "claude.ai",
        subscriptionType: "max",
      }),
    );
    assert.equal(avail.available, true);
    assert.equal(avail.subscriptionType, "max");
  });

  it("accepts oauth_token without subscriptionType (setup-token)", () => {
    const avail = interpretClaudeAuthStatus(
      JSON.stringify({
        loggedIn: true,
        authMethod: "oauth_token",
      }),
    );
    assert.equal(avail.available, true);
    assert.equal(avail.authMethod, "oauth_token");
  });
});

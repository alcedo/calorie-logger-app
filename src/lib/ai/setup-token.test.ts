import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateClaudeSetupToken } from "./setup-token";

describe("validateClaudeSetupToken", () => {
  it("rejects empty paste", () => {
    const result = validateClaudeSetupToken("   ");
    assert.equal(result.ok, false);
  });

  it("rejects Anthropic API keys", () => {
    const result = validateClaudeSetupToken("sk-ant-api03-not-a-subscription");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /API key/);
  });

  it("rejects generic sk- keys (OpenAI-shaped)", () => {
    const result = validateClaudeSetupToken("sk-proj-openai");
    assert.equal(result.ok, false);
  });

  it("accepts a Claude setup-token (sk-ant-oat)", () => {
    const result = validateClaudeSetupToken("sk-ant-oat01-subscription");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.token, "sk-ant-oat01-subscription");
  });
});

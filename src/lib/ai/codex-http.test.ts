import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { codexHttpModelId, parseAccountIdFromIdToken } from "./codex-http";

describe("codexHttpModelId", () => {
  it("defaults to gpt-5.1-codex", () => {
    assert.equal(codexHttpModelId(""), "gpt-5.1-codex");
    assert.equal(codexHttpModelId("gpt-5.2"), "gpt-5.2");
  });
});

describe("parseAccountIdFromIdToken", () => {
  it("reads chatgpt_account_id from the payload", () => {
    const payload = Buffer.from(
      JSON.stringify({
        "https://chatgpt.com/auth": { chatgpt_account_id: "acct-1" },
      }),
    ).toString("base64url");
    assert.equal(parseAccountIdFromIdToken(`x.${payload}.y`), "acct-1");
  });
});

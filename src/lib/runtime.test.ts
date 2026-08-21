import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  isServerlessHost,
  SERVERLESS_NONE_BANNER,
  SERVERLESS_CLI_DETAIL,
} from "./runtime";

describe("isServerlessHost", () => {
  it("detects Vercel Functions", () => {
    assert.equal(isServerlessHost({ VERCEL: "1" }), true);
    assert.equal(isServerlessHost({ VERCEL: "true" }), true);
    assert.equal(isServerlessHost({}), false);
  });
});

describe("serverless copy", () => {
  it("tells operators to use the OpenAI API on Vercel", () => {
    assert.match(SERVERLESS_NONE_BANNER, /AI_PROVIDER=openai/);
    assert.match(SERVERLESS_CLI_DETAIL, /cannot run on Vercel/);
  });
});

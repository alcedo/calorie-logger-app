import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import {
  CLAUDE_CODE_IDENTITY,
  claudeHttpHeaders,
  claudeHttpModelId,
  generateJsonViaClaudeHttp,
} from "./claude-http";

describe("claudeHttpModelId", () => {
  it("maps picker aliases to Messages API ids", () => {
    assert.equal(claudeHttpModelId(""), "claude-sonnet-4-6");
    assert.equal(claudeHttpModelId("haiku"), "claude-haiku-4-5-20251001");
    assert.equal(claudeHttpModelId("claude-opus-4-6"), "claude-opus-4-6");
  });
});

describe("generateJsonViaClaudeHttp", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends the OAuth token as x-api-key and reads tool input", async () => {
    const headers = claudeHttpHeaders("sk-ant-oat-test");
    assert.equal(headers["x-api-key"], "sk-ant-oat-test");
    assert.match(headers["anthropic-beta"], /oauth-2025-04-20/);

    globalThis.fetch = (async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as {
        system: Array<{ text: string }>;
      };
      assert.equal(body.system[0].text, CLAUDE_CODE_IDENTITY);
      return new Response(
        JSON.stringify({
          content: [{ type: "tool_use", input: { name: "egg" } }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await generateJsonViaClaudeHttp<{ name: string }>(
      "sk-ant-oat-test",
      {
        system: "extract",
        user: "egg",
        schemaName: "meal_items",
        schema: { type: "object" },
      },
    );
    assert.deepEqual(result, { name: "egg" });
  });
});

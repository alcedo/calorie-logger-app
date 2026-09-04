import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import {
  overlayFromCookieHeader,
  parseCodexAuthJson,
  readClaudeCredential,
  readCodexCredential,
  replaceRequestCodexAuth,
  runWithRequestCredentials,
  serializeCodexAuth,
} from "./credentials";

const saved = {
  CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
  CODEX_AUTH_JSON: process.env.CODEX_AUTH_JSON,
};

afterEach(() => {
  if (saved.CLAUDE_CODE_OAUTH_TOKEN === undefined) {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  } else process.env.CLAUDE_CODE_OAUTH_TOKEN = saved.CLAUDE_CODE_OAUTH_TOKEN;
  if (saved.CODEX_AUTH_JSON === undefined) delete process.env.CODEX_AUTH_JSON;
  else process.env.CODEX_AUTH_JSON = saved.CODEX_AUTH_JSON;
});

describe("parseCodexAuthJson", () => {
  it("reads the compact store shape and the Codex auth.json shape", () => {
    const compact = parseCodexAuthJson(
      serializeCodexAuth({
        accessToken: "acc",
        refreshToken: "ref",
        accountId: "acct",
      }),
    );
    assert.deepEqual(compact, {
      accessToken: "acc",
      refreshToken: "ref",
      accountId: "acct",
    });
    const official = parseCodexAuthJson(
      JSON.stringify({
        tokens: { access_token: "a2", refresh_token: "r2" },
        account_id: "id2",
      }),
    );
    assert.deepEqual(official, {
      accessToken: "a2",
      refreshToken: "r2",
      accountId: "id2",
    });
  });
});

describe("readClaudeCredential", () => {
  it("prefers a request overlay over env", () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-oat-env";
    const cred = runWithRequestCredentials(
      { claudeToken: "sk-ant-oat-req" },
      () => readClaudeCredential(),
    );
    assert.equal(cred?.token, "sk-ant-oat-req");
    assert.equal(cred?.source, "request");
  });

  it("rejects an API key", () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-api03-nope";
    assert.equal(readClaudeCredential(), null);
  });
});

describe("readCodexCredential", () => {
  it("lets a refresh replace the request overlay", () => {
    runWithRequestCredentials(
      { codexAuth: { accessToken: "old", refreshToken: "r" } },
      () => {
        replaceRequestCodexAuth({
          accessToken: "new",
          refreshToken: "r2",
        });
        assert.equal(readCodexCredential()?.accessToken, "new");
      },
    );
  });

  it("reads CODEX_AUTH_JSON", () => {
    process.env.CODEX_AUTH_JSON = serializeCodexAuth({
      accessToken: "a",
      refreshToken: "r",
    });
    const cred = readCodexCredential();
    assert.equal(cred?.accessToken, "a");
    assert.equal(cred?.source, "env");
  });
});

describe("overlayFromCookieHeader", () => {
  it("parses both cookies", () => {
    const overlay = overlayFromCookieHeader(
      "macro_claude_oat=sk-ant-oat-c; macro_codex_auth=%7B%22accessToken%22%3A%22a%22%2C%22refreshToken%22%3A%22r%22%7D",
    );
    assert.equal(overlay.claudeToken, "sk-ant-oat-c");
    assert.equal(overlay.codexAuth?.accessToken, "a");
  });
});

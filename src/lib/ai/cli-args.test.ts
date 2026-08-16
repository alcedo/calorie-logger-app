import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CLAUDE_AUTH_LOGIN_ARGS,
  CLAUDE_AUTH_STATUS_ARGS,
  CODEX_DEVICE_LOGIN_ARGS,
  argsForbid,
  claudePrintArgs,
  codexExecArgs,
} from "./cli-args";

describe("claude CLI argv", () => {
  it("login uses official claude.ai OAuth, not --bare", () => {
    assert.deepEqual([...CLAUDE_AUTH_LOGIN_ARGS], [
      "auth",
      "login",
      "--claudeai",
    ]);
    assert.ok(argsForbid(CLAUDE_AUTH_LOGIN_ARGS, "--bare"));
  });

  it("print mode never uses --bare and requires structured JSON flags", () => {
    const args = claudePrintArgs({
      schemaJson: "{}",
      system: "sys",
    });
    assert.ok(argsForbid(args, "--bare"));
    assert.equal(args[0], "-p");
    assert.ok(args.includes("--output-format"));
    assert.ok(args.includes("json"));
    assert.ok(args.includes("--json-schema"));
    assert.ok(args.includes("--tools"));
    assert.equal(args[args.indexOf("--tools") + 1], "");
    assert.ok(args.includes("--strict-mcp-config"));
    assert.ok(args.includes("--max-turns"));
    assert.equal(args[args.indexOf("--max-turns") + 1], "2");
    assert.ok(args.includes("--no-session-persistence"));
    assert.deepEqual([...CLAUDE_AUTH_STATUS_ARGS], ["auth", "status"]);
  });
});

describe("codex CLI argv", () => {
  it("device login uses --device-auth", () => {
    assert.deepEqual([...CODEX_DEVICE_LOGIN_ARGS], [
      "login",
      "--device-auth",
    ]);
  });

  it("exec never passes --ask-for-approval (Codex 0.147 rejects it)", () => {
    const args = codexExecArgs({
      schemaPath: "/tmp/schema.json",
      outPath: "/tmp/out.json",
    });
    assert.ok(argsForbid(args, "--ask-for-approval"));
    assert.equal(args[0], "exec");
    assert.equal(args[1], "-");
    assert.ok(args.includes("--output-schema"));
    assert.ok(args.includes("--sandbox"));
    assert.ok(args.includes("read-only"));
    assert.ok(args.includes("--skip-git-repo-check"));
    assert.ok(args.includes("--ephemeral"));
  });
});

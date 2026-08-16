import assert from "node:assert/strict";
import { chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import {
  CliError,
  cliIsInstalled,
  cliNotFoundMessage,
  isCliNotFound,
  publicCliErrorMessage,
  requireCliInstalled,
  resolveExecutable,
  runCli,
} from "./run-cli";

const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));
const fakeClaude = join(fixtures, "fake-claude-login.mjs");

describe("CLI missing-binary errors", () => {
  it("detects Node spawn ENOENT", () => {
    const err = Object.assign(new Error("spawn codex ENOENT"), {
      code: "ENOENT",
    });
    assert.equal(isCliNotFound(err), true);
  });

  it("does not leak spawn ENOENT to the user", () => {
    const err = Object.assign(new Error("spawn codex ENOENT"), {
      code: "ENOENT",
    });
    const message = publicCliErrorMessage(err);
    assert.match(message, /codex CLI not found/i);
    assert.doesNotMatch(message, /spawn /);
    assert.doesNotMatch(message, /ENOENT/);
  });

  it("maps Claude spawn ENOENT", () => {
    const err = Object.assign(new Error("spawn claude ENOENT"), {
      code: "ENOENT",
    });
    assert.match(publicCliErrorMessage(err), /claude CLI not found/i);
  });

  it("maps CliError with a command path", () => {
    const err = new CliError(
      "codex not found on PATH",
      "/usr/local/bin/codex",
      ["login"],
      null,
      "",
      "",
      false,
      "ENOENT",
    );
    assert.equal(publicCliErrorMessage(err), cliNotFoundMessage("codex"));
  });
});

describe("CLI PATH preflight", () => {
  it("treats a missing absolute path as not installed", () => {
    assert.equal(cliIsInstalled("/no/such/macro-codex-binary"), false);
    assert.equal(resolveExecutable("/no/such/macro-codex-binary"), null);
  });

  it("finds node on PATH and an existing fixture binary", () => {
    chmodSync(fakeClaude, 0o755);
    assert.equal(cliIsInstalled("node"), true);
    assert.equal(cliIsInstalled(fakeClaude), true);
  });

  it("finds a bare name when its directory is on PATH", () => {
    chmodSync(fakeClaude, 0o755);
    const env = { PATH: fixtures };
    assert.equal(cliIsInstalled("fake-claude-login.mjs", env), true);
    assert.equal(
      cliIsInstalled("fake-claude-login.mjs", { PATH: "/no/such" }),
      false,
    );
  });

  it("requireCliInstalled throws a readable error without ENOENT", () => {
    assert.throws(
      () => requireCliInstalled("/no/such/macro-claude-binary"),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /claude CLI not found/i);
        assert.doesNotMatch(err.message, /spawn /);
        assert.doesNotMatch(err.message, /ENOENT/);
        return true;
      },
    );
  });

  it("runCli rejects a missing binary without waiting on a spawn timeout", async () => {
    const started = Date.now();
    await assert.rejects(
      () =>
        runCli({
          command: "/no/such/macro-codex-binary",
          args: ["login"],
          env: process.env,
          timeoutMs: 20_000,
        }),
      (err: unknown) => {
        assert.ok(err instanceof CliError);
        assert.equal(err.code, "ENOENT");
        assert.match(err.message, /codex CLI not found/i);
        assert.doesNotMatch(err.message, /spawn /);
        return true;
      },
    );
    assert.ok(Date.now() - started < 2000);
  });

  it("does not treat a directory as an installed CLI", () => {
    assert.equal(cliIsInstalled(tmpdir()), false);
  });
});

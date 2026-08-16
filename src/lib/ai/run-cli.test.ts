import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  CliError,
  cliNotFoundMessage,
  isCliNotFound,
  publicCliErrorMessage,
} from "./run-cli";

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

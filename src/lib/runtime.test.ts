import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { isServerlessHost } from "./runtime";

describe("isServerlessHost", () => {
  const prior = process.env.VERCEL;

  afterEach(() => {
    if (prior === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prior;
  });

  it("is true when VERCEL is 1 or true", () => {
    assert.equal(isServerlessHost({ VERCEL: "1" }), true);
    assert.equal(isServerlessHost({ VERCEL: "true" }), true);
  });

  it("is false for other values", () => {
    assert.equal(isServerlessHost({}), false);
    assert.equal(isServerlessHost({ VERCEL: undefined }), false);
    assert.equal(isServerlessHost({ VERCEL: "" }), false);
    assert.equal(isServerlessHost({ VERCEL: "0" }), false);
    assert.equal(isServerlessHost({ VERCEL: "false" }), false);
  });

  it("reads process.env when no argument is passed", () => {
    process.env.VERCEL = "1";
    assert.equal(isServerlessHost(), true);
    delete process.env.VERCEL;
    assert.equal(isServerlessHost(), false);
  });
});

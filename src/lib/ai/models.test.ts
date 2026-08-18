import { describe, expect, it, vi } from "vitest";
import {
  catalogWithSelected,
  isAllowedModelId,
  labelForModel,
  MODEL_CATALOG,
  normalizeModelId,
  resolveModelFor,
} from "./models";

vi.mock("../settings", () => ({
  SETTING_AI_CLAUDE_MODEL: "ai_claude_model",
  SETTING_AI_CODEX_MODEL: "ai_codex_model",
  SETTING_AI_OPENAI_MODEL: "ai_openai_model",
  getSetting: () => undefined,
}));

describe("normalizeModelId", () => {
  it("treats default and empty as CLI default", () => {
    expect(normalizeModelId("")).toBe("");
    expect(normalizeModelId("default")).toBe("");
    expect(normalizeModelId("  haiku  ")).toBe("haiku");
  });

  it("rejects junk", () => {
    expect(normalizeModelId("bad model")).toBeUndefined();
    expect(normalizeModelId("x".repeat(81))).toBeUndefined();
    expect(normalizeModelId(null)).toBeUndefined();
  });
});

describe("model catalog", () => {
  it("never auto-includes a paid-only OpenAI default of empty id", () => {
    expect(MODEL_CATALOG.openai.every((m) => m.id.length > 0)).toBe(true);
    expect(MODEL_CATALOG.claude.some((m) => m.id === "")).toBe(true);
  });

  it("labels known and custom models", () => {
    expect(labelForModel("claude", "haiku")).toMatch(/Haiku/);
    expect(labelForModel("claude", "my-finetune")).toBe("my-finetune (custom)");
  });

  it("appends a custom selected id to the catalog", () => {
    const catalog = catalogWithSelected("openai", "gpt-special");
    expect(catalog.some((m) => m.id === "gpt-special")).toBe(true);
  });

  it("allows catalog ids and conservative custom ids", () => {
    expect(isAllowedModelId("claude", "")).toBe(true);
    expect(isAllowedModelId("openai", "")).toBe(false);
    expect(isAllowedModelId("openai", "gpt-4o-mini")).toBe(true);
    expect(isAllowedModelId("codex", "gpt-5.1-codex")).toBe(true);
  });
});

describe("resolveModelFor", () => {
  it("falls back to gpt-4o-mini for OpenAI", async () => {
    const prev = process.env.OPENAI_MODEL;
    delete process.env.OPENAI_MODEL;
    expect(await resolveModelFor("openai")).toBe("gpt-4o-mini");
    if (prev === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = prev;
  });

  it("reads env when no setting is stored", async () => {
    const prev = process.env.AI_CLAUDE_MODEL;
    process.env.AI_CLAUDE_MODEL = "opus";
    expect(await resolveModelFor("claude")).toBe("opus");
    if (prev === undefined) delete process.env.AI_CLAUDE_MODEL;
    else process.env.AI_CLAUDE_MODEL = prev;
  });
});

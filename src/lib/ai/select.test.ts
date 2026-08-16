import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_ORDER,
  API_KEY_BANNER,
  NONE_BANNER,
  resolveAiStatusView,
} from "./select";
import type { ProviderAvailability, ProviderId } from "./types";

function probed(
  overrides: Partial<Record<ProviderId, Partial<ProviderAvailability>>> = {},
): Record<ProviderId, ProviderAvailability> {
  const missing = (detail: string): ProviderAvailability => ({
    available: false,
    detail,
    reason: "missing",
  });
  const base: Record<ProviderId, ProviderAvailability> = {
    claude: missing("Not logged in"),
    codex: missing("Not logged in"),
    openai: missing("OPENAI_API_KEY is not set"),
  };
  for (const id of Object.keys(overrides) as ProviderId[]) {
    base[id] = { ...base[id], ...overrides[id] } as ProviderAvailability;
  }
  return base;
}

describe("AUTO_ORDER", () => {
  it("never includes openai", () => {
    assert.deepEqual(AUTO_ORDER, ["claude", "codex"]);
    assert.ok(!AUTO_ORDER.includes("openai"));
  });
});

describe("resolveAiStatusView", () => {
  it("auto picks Claude over Codex and ignores a present OpenAI key", () => {
    const view = resolveAiStatusView({
      selection: "auto",
      probed: probed({
        claude: {
          available: true,
          detail: "Subscription login (max)",
          authMethod: "claude.ai",
          subscriptionType: "max",
        },
        codex: { available: true, detail: "Logged in" },
        openai: { available: true, detail: "key set" },
      }),
    });
    assert.equal(view.provider, "claude");
    assert.equal(view.aiAvailable, true);
    assert.equal(view.bannerKind, "ok");
    assert.match(view.providerLabel ?? "", /max/);
  });

  it("auto picks Codex when Claude is missing, still ignoring OpenAI", () => {
    const view = resolveAiStatusView({
      selection: "auto",
      probed: probed({
        codex: { available: true, detail: "Logged in" },
        openai: { available: true, detail: "key set" },
      }),
    });
    assert.equal(view.provider, "codex");
    assert.equal(view.bannerKind, "ok");
  });

  it("auto never selects openai even if it is the only available provider", () => {
    const view = resolveAiStatusView({
      selection: "auto",
      probed: probed({
        openai: { available: true, detail: "OPENAI_API_KEY is set" },
      }),
    });
    assert.equal(view.provider, null);
    assert.equal(view.aiAvailable, false);
    assert.equal(view.bannerKind, "none");
    assert.equal(view.bannerMessage, NONE_BANNER);
  });

  it("auto surfaces the API-key banner when Claude would bill a key", () => {
    const view = resolveAiStatusView({
      selection: "auto",
      probed: probed({
        claude: {
          available: false,
          detail: "Would bill an API key (ANTHROPIC_API_KEY).",
          reason: "api_key",
        },
        openai: { available: true, detail: "key set" },
      }),
    });
    assert.equal(view.provider, null);
    assert.equal(view.bannerKind, "api_key");
    assert.match(view.bannerMessage ?? "", /API key/);
  });

  it("auto uses the stray-key banner when env has a key but probe did not", () => {
    const view = resolveAiStatusView({
      selection: "auto",
      probed: probed(),
      strayAnthropicKey: true,
    });
    assert.equal(view.bannerKind, "api_key");
    assert.equal(view.bannerMessage, API_KEY_BANNER);
  });

  it("pinning claude does not fall through to Codex", () => {
    const view = resolveAiStatusView({
      selection: "claude",
      probed: probed({
        claude: { available: false, detail: "Not logged in", reason: "missing" },
        codex: { available: true, detail: "Logged in" },
      }),
    });
    assert.equal(view.provider, null);
    assert.equal(view.aiAvailable, false);
    assert.match(view.bannerMessage ?? "", /Not logged in/);
  });

  it("openai is only used when explicitly selected and the key is set", () => {
    const on = resolveAiStatusView({
      selection: "openai",
      probed: probed({ openai: { available: true, detail: "key set" } }),
    });
    assert.equal(on.provider, "openai");
    assert.equal(on.bannerKind, "ok");

    const off = resolveAiStatusView({
      selection: "openai",
      probed: probed(),
    });
    assert.equal(off.provider, null);
    assert.match(off.bannerMessage ?? "", /OPENAI_API_KEY is not set/);
  });
});

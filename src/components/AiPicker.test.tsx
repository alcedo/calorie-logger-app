/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiPicker } from "./AiPicker";
import type { AiStatusDto } from "@/lib/ai/types";

function status(overrides: Partial<AiStatusDto> = {}): AiStatusDto {
  return {
    aiAvailable: true,
    provider: "claude",
    providerLabel: "Claude Code (subscription)",
    selection: "auto",
    providers: [
      { id: "claude", available: true, detail: "ok" },
      { id: "codex", available: false, detail: "missing", reason: "missing" },
      { id: "openai", available: false, detail: "no key", reason: "missing" },
    ],
    bannerKind: "ok",
    bannerMessage: null,
    logins: [],
    models: { claude: "sonnet", codex: "", openai: "gpt-4o-mini" },
    modelCatalog: {
      claude: [
        { id: "", label: "Default (Claude Code)" },
        { id: "sonnet", label: "Sonnet — balanced" },
        { id: "haiku", label: "Haiku — fastest" },
      ],
      codex: [{ id: "", label: "Default (Codex)" }],
      openai: [{ id: "gpt-4o-mini", label: "GPT-4o mini" }],
    },
    activeModel: "sonnet",
    activeModelLabel: "Sonnet — balanced",
    ...overrides,
  };
}

describe("AiPicker", () => {
  afterEach(() => cleanup());

  it("lets the user change provider and model", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AiPicker status={status()} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("AI provider"), "claude");
    expect(onChange).toHaveBeenCalledWith({ selection: "claude" });

    await user.selectOptions(screen.getByLabelText("claude model"), "haiku");
    expect(onChange).toHaveBeenCalledWith({ models: { claude: "haiku" } });
  });

  it("disables OpenAI when no API key is configured", () => {
    render(<AiPicker status={status()} onChange={vi.fn()} />);
    expect(screen.getByRole("option", { name: /OpenAI API/ })).toBeDisabled();
  });
});

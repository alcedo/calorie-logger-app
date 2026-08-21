/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiPage from "./page";
import type { AiStatusDto } from "@/lib/ai/types";

function status(overrides: Partial<AiStatusDto> = {}): AiStatusDto {
  return {
    aiAvailable: false,
    provider: null,
    providerLabel: null,
    selection: "auto",
    providers: [
      {
        id: "claude",
        available: false,
        detail: "claude CLI not found on PATH. Install Claude Code on the computer running this app, then connect Claude again.",
        reason: "missing",
        cliInstalled: false,
      },
      {
        id: "codex",
        available: false,
        detail: "codex CLI not found on PATH. Install Codex on the computer running this app, then connect ChatGPT again.",
        reason: "missing",
        cliInstalled: false,
      },
      { id: "openai", available: false, detail: "no key", reason: "missing" },
    ],
    bannerKind: "none",
    bannerMessage: "AI is not configured.",
    logins: [],
    models: { claude: "", codex: "", openai: "gpt-4o-mini" },
    modelCatalog: {
      claude: [{ id: "", label: "Default (Claude Code)" }],
      codex: [{ id: "", label: "Default (Codex)" }],
      openai: [{ id: "gpt-4o-mini", label: "GPT-4o mini" }],
    },
    activeModel: null,
    activeModelLabel: null,
    serverlessHost: false,
    ...overrides,
  };
}

function mockStatus(value: AiStatusDto) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => value,
    }),
  );
}

describe("AI connections page", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("disables Connect when the CLI is not installed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => status(),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AiPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect Claude" })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Connect ChatGPT" })).toBeDisabled();
    expect(screen.getAllByText("CLI not installed")).toHaveLength(2);
    expect(
      screen.getByText(/Install the CLI on that computer/i),
    ).toBeVisible();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Connect Claude" }));
    await user.click(screen.getByRole("button", { name: "Connect ChatGPT" }));
    expect(fetchMock.mock.calls.some((call) => {
      const init = call[1] as RequestInit | undefined;
      return typeof init?.body === "string" && init.body.includes('"connect"');
    })).toBe(false);
  });

  it("keeps Connect enabled when the CLI is installed but logged out", async () => {
    mockStatus(
      status({
        providers: [
          {
            id: "claude",
            available: false,
            detail: "Not logged in. Run `claude auth login`.",
            reason: "missing",
            cliInstalled: true,
          },
          {
            id: "codex",
            available: false,
            detail: "Not logged in. Run `codex login`.",
            reason: "missing",
            cliInstalled: true,
          },
          { id: "openai", available: false, detail: "no key", reason: "missing" },
        ],
      }),
    );
    render(<AiPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect Claude" })).toBeEnabled();
    });
    expect(screen.getByRole("button", { name: "Connect ChatGPT" })).toBeEnabled();
    expect(screen.queryByText("CLI not installed")).toBeNull();
  });

  it("disables Connect on Vercel and explains the OpenAI API fallback", async () => {
    mockStatus(
      status({
        serverlessHost: true,
        providers: [
          {
            id: "claude",
            available: false,
            detail: "Claude Code and Codex CLIs cannot run on Vercel.",
            reason: "serverless",
            cliInstalled: false,
          },
          {
            id: "codex",
            available: false,
            detail: "Claude Code and Codex CLIs cannot run on Vercel.",
            reason: "serverless",
            cliInstalled: false,
          },
          { id: "openai", available: false, detail: "no key", reason: "missing" },
        ],
      }),
    );
    render(<AiPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect Claude" })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Connect ChatGPT" })).toBeDisabled();
    expect(screen.getAllByText("Unavailable on Vercel")).toHaveLength(2);
    expect(screen.getByText(/This server is on Vercel/i)).toBeVisible();
    expect(screen.queryByText(/Install the CLI on that computer/i)).toBeNull();
  });
});

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

process.env.AUTH_SECRET ??= "vitest-auth-secret-32bytes-minimum!!";
process.env.AUTH_TEST_MINT ??= "1";

vi.mock("@/lib/ai/providers/claude", () => ({
  claudeProvider: {
    id: "claude",
    label: "Claude Code (subscription)",
    isAvailable: async () => ({
      available: false,
      detail: "Claude CLI is not installed on this host.",
      reason: "missing",
      cliInstalled: false,
    }),
    generateJson: async () => {
      throw new Error("Claude provider is mocked in tests");
    },
  },
}));

vi.mock("@/lib/ai/providers/codex", () => ({
  codexProvider: {
    id: "codex",
    label: "Codex CLI (ChatGPT login)",
    isAvailable: async () => ({
      available: false,
      detail: "Codex CLI is not installed on this host.",
      reason: "missing",
      cliInstalled: false,
    }),
    generateJson: async () => {
      throw new Error("Codex provider is mocked in tests");
    },
  },
}));

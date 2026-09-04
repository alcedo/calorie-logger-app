import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("@/lib/ai/providers/claude", () => ({
  claudeProvider: {
    id: "claude",
    label: "Claude Code (subscription)",
    isAvailable: async () => {
      const { readClaudeCredential } = await import("@/lib/ai/credentials");
      const cred = readClaudeCredential();
      if (cred) {
        return {
          available: true,
          detail: "Claude subscription token",
          authMethod: "oauth_token",
          cliInstalled: false,
        };
      }
      const serverless =
        process.env.VERCEL === "1" || process.env.VERCEL === "true";
      return {
        available: false,
        detail: serverless
          ? "Paste a Claude setup-token. Vercel cannot spawn Claude Code."
          : "Claude CLI is not installed on this host.",
        reason: serverless ? "serverless" : "missing",
        cliInstalled: false,
      };
    },
    generateJson: async () => {
      throw new Error("Claude provider is mocked in tests");
    },
  },
}));

vi.mock("@/lib/ai/providers/codex", () => ({
  codexProvider: {
    id: "codex",
    label: "Codex CLI (ChatGPT login)",
    isAvailable: async () => {
      const { readCodexCredential } = await import("@/lib/ai/credentials");
      const cred = readCodexCredential();
      if (cred) {
        return {
          available: true,
          detail: "ChatGPT subscription token",
          cliInstalled: false,
        };
      }
      const serverless =
        process.env.VERCEL === "1" || process.env.VERCEL === "true";
      return {
        available: false,
        detail: serverless
          ? "Connect ChatGPT. Vercel cannot spawn the Codex CLI."
          : "Codex CLI is not installed on this host.",
        reason: serverless ? "serverless" : "missing",
        cliInstalled: false,
      };
    },
    generateJson: async () => {
      throw new Error("Codex provider is mocked in tests");
    },
  },
}));

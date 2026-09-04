import { describe, expect, it } from "vitest";
import { userIdFromEmail } from "@/lib/auth/session";
import { claudeChildEnv } from "@/lib/ai/env";
import { activeLogins, cancelLogin, startClaudeLogin } from "@/lib/ai/login";
import { getAiStatus } from "@/lib/ai";
import { runAsUser } from "@/lib/tenant";
import { setupTempDatabase } from "@/test/helpers";
import { chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

setupTempDatabase();

const fakeClaude = fileURLToPath(
  new URL("./fixtures/fake-claude-login.mjs", import.meta.url),
);

function user(email: string, name: string) {
  return { id: userIdFromEmail(email), email, name };
}

describe("per-user AI slots", () => {
  it("keeps A's in-flight Claude login off B's status", async () => {
    chmodSync(fakeClaude, 0o755);
    const originalBin = process.env.AI_CLAUDE_BIN;
    const originalWait = process.env.AI_LOGIN_START_WAIT_MS;
    process.env.AI_CLAUDE_BIN = fakeClaude;
    process.env.AI_LOGIN_START_WAIT_MS = "2000";

    const a = user("ai-a@example.com", "AI A");
    const b = user("ai-b@example.com", "AI B");

    const login = await runAsUser(a, () => startClaudeLogin());
    try {
      const aLogins = runAsUser(a, () => activeLogins());
      const bLogins = runAsUser(b, () => activeLogins());
      expect(aLogins.map((l) => l.sessionId)).toContain(login.sessionId);
      expect(bLogins.map((l) => l.sessionId)).not.toContain(login.sessionId);

      const bStatus = await runAsUser(b, () => getAiStatus());
      expect(bStatus.logins.map((l) => l.sessionId)).not.toContain(
        login.sessionId,
      );
      expect(bStatus.providers.find((p) => p.id === "claude")?.available).toBe(
        false,
      );

      const aEnv = runAsUser(a, () => claudeChildEnv());
      const bEnv = runAsUser(b, () => claudeChildEnv());
      expect(aEnv.CLAUDE_CONFIG_DIR).toBeTruthy();
      expect(bEnv.CLAUDE_CONFIG_DIR).toBeTruthy();
      expect(aEnv.CLAUDE_CONFIG_DIR).not.toBe(bEnv.CLAUDE_CONFIG_DIR);
    } finally {
      runAsUser(a, () => cancelLogin(login.sessionId));
      if (originalBin === undefined) delete process.env.AI_CLAUDE_BIN;
      else process.env.AI_CLAUDE_BIN = originalBin;
      if (originalWait === undefined) delete process.env.AI_LOGIN_START_WAIT_MS;
      else process.env.AI_LOGIN_START_WAIT_MS = originalWait;
    }
  });
});

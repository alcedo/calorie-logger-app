import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const e2eRoot = path.join(os.tmpdir(), "calorie-logger-e2e");
const e2eUsers = path.join(e2eRoot, "users");
const port = Number(process.env.E2E_PORT || 3000);
const host = process.env.E2E_HOST || "127.0.0.1";
const baseURL = `http://${host}:${port}`;
const AUTH_SECRET = "playwright-auth-secret-32bytes-min!!";
const storageState = path.join(os.tmpdir(), "calorie-logger-e2e-storage.json");

if (!fs.existsSync(storageState)) {
  fs.writeFileSync(storageState, JSON.stringify({ cookies: [], origins: [] }));
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    storageState,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `rm -rf "${e2eRoot}" && mkdir -p "${e2eUsers}" && npm run dev -- --hostname ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 120_000,
    env: {
      ...process.env,
      MACRO_DATA_DIR: e2eUsers,
      AUTH_SECRET,
      AUTH_TEST_MINT: "1",
      OPENAI_API_KEY: "",
      AI_PROVIDER: "none",
      AI_CLAUDE_BIN: "/no/such/macro-claude-binary",
      AI_CODEX_BIN: "/no/such/macro-codex-binary",
    },
  },
});

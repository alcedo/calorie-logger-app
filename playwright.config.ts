import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

const e2eDb = path.join(os.tmpdir(), "calorie-logger-e2e.db");
const port = Number(process.env.E2E_PORT || 3000);
const host = process.env.E2E_HOST || "127.0.0.1";
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `rm -f "${e2eDb}" "${e2eDb}-wal" "${e2eDb}-shm" && npm run dev -- --hostname ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 120_000,
    env: {
      ...process.env,
      CALORIE_LOGGER_DB_PATH: e2eDb,
      OPENAI_API_KEY: "",
      AI_PROVIDER: "none",
    },
  },
});

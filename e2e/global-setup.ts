import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mintTestSession, sessionCookieName } from "../src/lib/auth/session";

const AUTH_SECRET = "playwright-auth-secret-32bytes-min!!";
const storageState = path.join(os.tmpdir(), "calorie-logger-e2e-storage.json");

export default async function globalSetup() {
  process.env.AUTH_SECRET ??= AUTH_SECRET;
  process.env.AUTH_TEST_MINT = "1";
  const cookie = await mintTestSession({
    email: "e2e@local.test",
    name: "E2E User",
  });
  const eq = cookie.indexOf("=");
  const value = cookie.slice(eq + 1);
  const host = process.env.E2E_HOST || "127.0.0.1";
  fs.writeFileSync(
    storageState,
    JSON.stringify({
      cookies: [
        {
          name: sessionCookieName(),
          value,
          domain: host,
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}

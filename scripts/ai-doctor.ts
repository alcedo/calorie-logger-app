/**
 * Probe AI providers and, if one is signed in, run a live parse + nutrition lookup.
 *
 *   npx tsx scripts/ai-doctor.ts
 *
 * Sign in first with `claude auth login` (preferred) or `codex login`.
 * This script does not accept or require API keys.
 */
import {
  clearAiStatusCache,
  getAiStatus,
  interpretClaudeAuthStatus,
  interpretClaudePrintResult,
  lookupNutrition,
  parseClaudeLoginOutput,
  parseCodexDeviceAuthOutput,
  parseMealText,
} from "../src/lib/ai";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message: string) {
  console.log(`ok  ${message}`);
}

async function fixtureChecks() {
  console.log("\n== fixture: unauthenticated claude -p payload ==");
  const payload = JSON.stringify({
    is_error: true,
    subtype: "success",
    terminal_reason: "api_error",
    result: "Not logged in · Please run /login",
    total_cost_usd: 0,
  });
  const outcome = interpretClaudePrintResult(payload, "", 1);
  if (outcome.ok) fail("auth-failure payload must not be treated as success");
  if (!/login/i.test(outcome.message)) {
    fail(`expected login hint in message, got: ${outcome.message}`);
  }
  pass("is_error + subtype:success is classified as failure");

  const emptySuccess = interpretClaudePrintResult(
    JSON.stringify({ is_error: false, subtype: "success" }),
    "",
    0,
  );
  if (emptySuccess.ok) fail("missing structured_output must be a failure");
  pass("success subtype without structured_output is classified as failure");

  const good = interpretClaudePrintResult(
    JSON.stringify({
      is_error: false,
      subtype: "success",
      structured_output: { n: 2 },
    }),
    "",
    0,
  );
  if (!good.ok) fail(`good payload rejected: ${good.message}`);
  pass("structured_output is accepted");

  const loggedOut = interpretClaudeAuthStatus(
    JSON.stringify({ loggedIn: false, authMethod: "none" }),
  );
  if (loggedOut.available) fail("loggedIn false must be unavailable");
  pass("auth status loggedIn:false is unavailable");

  const apiKey = interpretClaudeAuthStatus(
    JSON.stringify({
      loggedIn: true,
      authMethod: "api_key",
      apiKeySource: "ANTHROPIC_API_KEY",
    }),
  );
  if (apiKey.available || apiKey.reason !== "api_key") {
    fail("API key login must be rejected");
  }
  pass("authMethod api_key is rejected");

  const stray = interpretClaudeAuthStatus(
    JSON.stringify({
      loggedIn: true,
      authMethod: "claude.ai",
      apiKeySource: "ANTHROPIC_API_KEY",
      subscriptionType: null,
    }),
  );
  if (stray.available || stray.reason !== "api_key") {
    fail("claude.ai + apiKeySource must be rejected");
  }
  pass("stored login displaced by a key is rejected");

  const sub = interpretClaudeAuthStatus(
    JSON.stringify({
      loggedIn: true,
      authMethod: "claude.ai",
      subscriptionType: "max",
    }),
  );
  if (!sub.available) fail(`subscription login rejected: ${sub.detail}`);
  pass("claude.ai + max is accepted");

  const claudeUrl = parseClaudeLoginOutput(
    "Opening browser to sign in…\nIf the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&client_id=abc\nPaste code here if prompted >",
  );
  if (!claudeUrl?.loginUrl.includes("claude.com/cai/oauth/authorize")) {
    fail("failed to parse Claude login URL");
  }
  pass("Claude login URL parsed");

  const oscUrl =
    "https://claude.com/cai/oauth/authorize?code=true&client_id=abc&state=xyz";
  const claudeOsc = parseClaudeLoginOutput(
    `Opening browser to sign in…\nIf the browser didn't open, visit: \x1b]8;;${oscUrl}\x07${oscUrl}\x1b]8;;\x07\nPaste code here if prompted >`,
  );
  if (claudeOsc?.loginUrl !== oscUrl) {
    fail(`OSC-8 Claude URL: ${claudeOsc?.loginUrl}`);
  }
  pass("Claude login URL parsed from OSC-8 hyperlink");

  const codexDev = parseCodexDeviceAuthOutput(
    [
      "Follow these steps to sign in with ChatGPT using device code authorization:",
      "1. Open this link in your browser and sign in to your account",
      "   \x1b[94mhttps://auth.openai.com/codex/device\x1b[0m",
      "2. Enter this one-time code \x1b[90m(expires in 15 minutes)\x1b[0m",
      "   \x1b[94mUBN6-U35TZ\x1b[0m",
    ].join("\n"),
  );
  if (codexDev?.loginUrl !== "https://auth.openai.com/codex/device") {
    fail(`codex url: ${codexDev?.loginUrl}`);
  }
  if (codexDev?.userCode !== "UBN6-U35TZ") {
    fail(`codex code: ${codexDev?.userCode}`);
  }
  pass("Codex device-auth URL and code parsed");

  const codexOsc = parseCodexDeviceAuthOutput(
    [
      "Follow these steps to sign in with ChatGPT using device code authorization:",
      "1. Open this link in your browser and sign in to your account",
      `   \x1b]8;;https://auth.openai.com/codex/device\x07https://auth.openai.com/codex/device\x1b]8;;\x07`,
      "2. Enter this one-time code (expires in 15 minutes)\r",
      "   UCSZ-GZ4P1\r",
    ].join("\n"),
  );
  if (codexOsc?.loginUrl !== "https://auth.openai.com/codex/device") {
    fail(`codex OSC url: ${codexOsc?.loginUrl}`);
  }
  if (codexOsc?.userCode !== "UCSZ-GZ4P1") {
    fail(`codex CR code: ${codexOsc?.userCode}`);
  }
  pass("Codex device-auth parsed from OSC-8 and CR output");
}

async function liveChecks() {
  console.log("\n== providers ==");
  clearAiStatusCache();
  const status = await getAiStatus();
  console.log(JSON.stringify(status, null, 2));

  const claude = status.providers.find((p) => p.id === "claude");
  if (claude) {
    console.log(
      `\nClaude authMethod=${claude.authMethod ?? "?"} subscriptionType=${claude.subscriptionType ?? "?"} available=${claude.available}`,
    );
    if (claude.authMethod === "claude.ai" && claude.subscriptionType == null) {
      fail(
        "claude.ai login with null subscriptionType — a key is likely displacing the plan",
      );
    }
  }

  if (!status.aiAvailable) {
    console.log("\nNo subscription-backed provider available; skipping live calls.");
    console.log("Sign in with: claude auth login");
    return;
  }

  console.log(`\n== live parse via ${status.providerLabel} ==`);
  const items = await parseMealText("2 eggs and 200g chicken breast");
  console.log(JSON.stringify(items, null, 2));
  if (items.length < 2) fail("expected at least 2 parsed items");
  pass(`parsed ${items.length} items`);

  console.log("\n== live nutrition lookup (unknown food) ==");
  const nutrition = await lookupNutrition(["dragonfruit"]);
  const row = nutrition.get("dragonfruit");
  if (!row) fail("nutrition map missing dragonfruit");
  console.log(JSON.stringify(row, null, 2));
  if (!(row.calories > 0)) fail("expected calories > 0");
  pass("nutrition lookup returned calories");
}

async function main() {
  console.log("Macro AI doctor");
  await fixtureChecks();
  await liveChecks();
  console.log("\nAll doctor checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

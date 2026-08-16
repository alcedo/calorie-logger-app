/**
 * Probe signed-in AI providers and run a live parse + nutrition lookup.
 *
 *   npm run ai:doctor
 *
 * Contract tests (no login required) live in `npm test`.
 * Sign in first with `claude auth login` (preferred) or `codex login`.
 * This script does not accept or require API keys.
 */
import {
  clearAiStatusCache,
  getAiStatus,
  lookupNutrition,
  parseMealText,
} from "../src/lib/ai";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function pass(message: string) {
  console.log(`ok  ${message}`);
}

async function liveChecks() {
  console.log("== providers ==");
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
    console.log("Contract tests: npm test");
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
  await liveChecks();
  console.log("\nAll doctor checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

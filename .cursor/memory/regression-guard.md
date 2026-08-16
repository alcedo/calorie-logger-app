# regression-guard project memory

Durable facts for the Macro calorie-logger regression reviewer. Update this file after a review when you learn something that would have changed the next review. Do not record one-off diffs.

## Test commands

- Unit + API/DB integration (CI): `npm test` → `vitest run` (`vitest.config.mts`)
- Lint (CI): `npm run lint`
- E2E (not in CI): `npm run test:e2e` → Playwright `e2e/app.spec.ts`
- Default branch: `main`

## Load-bearing tests

These encode product requirements. Deleting, skipping, or weakening them is BLOCKING unless the requirement itself changed.

- `src/lib/fallback-parse.test.ts` — canonical smoke phrase `"2 eggs and 200g chicken breast"`; offline parser when no AI CLI is signed in
- `src/app/api/log.integration.test.ts` — `POST /api/log` persist path, food lookup (exact / alias / fuzzy), and that long queries must not collapse onto short substring foods
- `src/lib/ai.test.ts` + `src/lib/ai/env.test.ts` — `OPENAI_API_KEY` is never auto-selected; Anthropic API keys must be stripped from the Claude child env
- `src/lib/types.test.ts` — `todayLocalDate` is local calendar date, not UTC (midnight timezone bugs)
- `src/lib/units.test.ts` — gram/kg/oz serving math and macro rounding
- `src/db/index.integration.test.ts` — SQLite schema and seed behavior against a temp DB (`setupTempDatabase`)
- `src/lib/ai/select.ts` `AUTO_ORDER` — must stay `claude` then `codex`; openai is opt-in only
- `POST /api/log` JSON (`logged` / `unresolved` / `usedAiParser`) is still the API/test contract; the Today UI logs via SSE (`?stream=1` + `Accept: text/event-stream`)

## Hidden coupling

- Food lookup is local SQLite first (`findFood` / aliases / fuzzy), then AI fallback; AI hits are cached back into `foods`. Changing normalize/fuzzy matching silently retargets logs onto the wrong food.
- `AI_PROVIDER=auto` must not pick OpenAI even if `OPENAI_API_KEY` is set.
- Next.js in this repo has breaking APIs vs training data; check `node_modules/next/dist/docs/` before treating App Router / config changes as equivalent to older Next.
- Integration tests use a temp SQLite DB, not `data/app.db`. Don't treat a missing `data/app.db` as a test failure.
- Meal persist logic lives in `src/lib/log-meal.ts` (not only `src/app/api/log/route.ts`). Mocking `@/lib/ai` still works for log tests because `log-meal` imports those symbols.
- `lookupNutrition` always calls `searchNutritionWeb` (USDA / Open Food Facts / DuckDuckGo) before the LLM. `src/lib/ai.test.ts` mocks `@/lib/nutrition-search`; CI never hits those APIs.
- Parse/nutrition JSON schemas now require `reasoning` (nutrition also `sources`). Live CLI structured-output is not in CI.
- Playwright: `next dev` blocks cross-origin `127.0.0.1` vs `localhost`. Use `E2E_HOST=localhost` when the existing server was started on localhost; use `E2E_PORT` if :3000 is already taken. `E2E_REUSE=1` is opt-in.

## Past regressions

_(none recorded yet)_

## Fragile modules

- `src/lib/fallback-parse.ts` — regex/word-number parser; easy to break smoke logging without AI
- `src/lib/food-lookup.ts` — fuzzy match can collide on short food names
- `src/lib/ai/` — provider selection, CLI env sanitization, login/parse contracts
- `src/lib/nutrition-search.ts` — live HTTP; failures should degrade to empty hits, not throw
- `src/lib/log-meal.ts` — empty parse must still yield HTTP 422 (JSON) / SSE `error` with no foods
- `src/db/schema.ts` + seed data — column/constraint changes without a backfill break existing `data/app.db` files

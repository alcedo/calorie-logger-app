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

## Hidden coupling

- Food lookup is local SQLite first (`findFood` / aliases / fuzzy), then AI fallback; AI hits are cached back into `foods`. Changing normalize/fuzzy matching silently retargets logs onto the wrong food.
- `AI_PROVIDER=auto` must not pick OpenAI even if `OPENAI_API_KEY` is set.
- Next.js in this repo has breaking APIs vs training data; check `node_modules/next/dist/docs/` before treating App Router / config changes as equivalent to older Next.
- Integration tests use a temp SQLite DB, not `data/app.db`. Don't treat a missing `data/app.db` as a test failure.

## Past regressions

_(none recorded yet)_

## Fragile modules

- `src/lib/fallback-parse.ts` — regex/word-number parser; easy to break smoke logging without AI
- `src/lib/food-lookup.ts` — fuzzy match can collide on short food names
- `src/lib/ai/` — provider selection, CLI env sanitization, login/parse contracts
- `src/db/schema.ts` + seed data — column/constraint changes without a backfill break existing `data/app.db` files

# How the single-user app works today

## Overview

Macro is one Next.js 16 process with one SQLite file and one Claude/Codex CLI home. Every API route reads and writes that file. There is no login. The README already says not to host this for other people on one Claude plan.

## Key concepts

**Food / Entry / Goals / Settings.** Drizzle tables in `src/db/schema.ts`. Foods are a shared catalog today. Entries are daily logs keyed by `YYYY-MM-DD`. Goals is a single row `id=1`. Settings is a key/value table for AI provider, models, and optional `claude_oauth_token`.

**`db` singleton.** `src/db/index.ts` opens one better-sqlite3 handle, stores it on `globalThis.__calorieLoggerDb`, and exports a Proxy so tests can swap the file via `resetDbForTests`. Path order: explicit argument, `CALORIE_LOGGER_DB_PATH`, Vercel tmpdir, else `data/app.db`.

**Meal log.** `POST /api/log` -> `logMeal` in `src/lib/log-meal.ts`. Parse with AI if a provider is available, else `fallbackParse`. Resolve names with `findFood` then USDA/web + `lookupNutrition`. Insert `entries` rows. Stream thought events over SSE when asked.

**AI login.** `POST /api/ai` action `connect` spawns `claude auth login` or Codex device login. Sessions live in `globalThis.__macroAiLogins`. Child env comes from `claudeChildEnv()` / `codexChildEnv()` in `src/lib/ai/env.ts`. Those functions strip `ANTHROPIC_API_KEY` and drop scratch `CLAUDE_CONFIG_DIR` under `/tmp`. A stored or env `CLAUDE_CODE_OAUTH_TOKEN` is the headless fallback.

**AI status cache.** `getAiStatus` keeps one process-wide 30s cache. Provider preference and models are settings rows in the same shared DB.

## How a request works

1. Browser pages (`src/app/page.tsx` and siblings) `fetch` `/api/entries`, `/api/log`, `/api/status` with no credentials beyond cookies the browser already has. There is no session cookie today.
2. Route handlers import `{ db }` and query. Example: `src/app/api/entries/route.ts` selects all entries for a date.
3. `logMeal` and `food-lookup` also import `{ db }`. Settings helpers do the same.
4. AI probe shells out to CLIs using the server user's home. Login writes credentials there. The next request from anyone uses that login.

## Where things live

- Schema and open/seed: `src/db/schema.ts`, `src/db/index.ts`
- Settings: `src/lib/settings.ts`
- Log path: `src/app/api/log/route.ts`, `src/lib/log-meal.ts`, `src/lib/food-lookup.ts`
- AI: `src/lib/ai/index.ts`, `src/lib/ai/login.ts`, `src/lib/ai/env.ts`, `src/app/api/ai/route.ts`
- UI: `src/app/page.tsx`, `src/app/history/page.tsx`, `src/app/foods/page.tsx`, `src/app/ai/page.tsx`, `src/components/Nav.tsx`
- Tests: `src/test/helpers.ts` (`setupTempDatabase`), `src/app/api/rest.integration.test.ts`, `src/app/api/log.integration.test.ts`, `e2e/app.spec.ts`
- Verify: `.cursor/skills/verify-macro/SKILL.md` launches an isolated `next dev` with `CALORIE_LOGGER_DB_PATH` and `AI_PROVIDER=none`

## Gotchas

- Next 16 renamed middleware to `proxy.ts`. Auth redirects belong there or in each route. Route handlers still must check the session themselves. UI hide is not enough. See `node_modules/next/dist/docs/01-app/02-guides/authentication.md` and `.../file-conventions/proxy.md`.
- One Node process can serve two users at once. A single `globalThis.__calorieLoggerDb` pointer cannot be swapped per request without races.
- `statusCache` and `__macroAiLogins` leak across users if left global.
- `claudeChildEnv` deletes `CLAUDE_CONFIG_DIR` when it is under `/tmp`. Per-user config dirs must live outside that rule or the rule must change.
- README forbids sharing one Claude subscription. Per-user Claude is required, not optional.
- Playwright and verify-macro assume `/` is open and `/api/status` is public. Both need a signed-in helper.
- Vercel tmpdir is one file for the whole instance. Per-user files on Vercel still die on cold start. Keep the path helper, but isolation is for durable hosts (`data/users/<id>/`).
- Client pages hold entries in React state only. Same-browser user switch needs a full reload after sign-out or the old list can flash.

## Extra constraints from explorers

- `GET /api/status` returns every in-flight AI login (`sessionId`, URL, Codex user code). Any tab can steal a connect-in-progress. Status must become per-user and authenticated.
- `cancelProvider` kills every Claude or Codex login child in the process. Login maps must key by user.
- Host `CLAUDE_CODE_OAUTH_TOKEN` and `AI_PROVIDER` beat the settings table and survive disconnect. After SSO those host vars must not override another user's store. Tests may still set them.
- `dropScratchHomes` deletes `CLAUDE_CONFIG_DIR` / `CODEX_HOME` under `/tmp`. Per-user CLI homes go under `data/users/<id>/`, not `/tmp`.
- History `dayEntries` and the AI setup-token field live in React state. Logout must full-reload.
- Client pages do not handle 401. A gate without a login page and fetch `ok` checks will throw on `data.entries`.
- Playwright, verify-macro, and AGENTS.md smoke assume open APIs. They need a minted session, not a public exception.
- `CREATE TABLE IF NOT EXISTS` does not migrate existing files. New catalog tables are a new file, not columns on `app.db`.
- Integration tests call handlers with a `NextRequest`. `cookies()` from `next/headers` throws outside a request scope. Read the session from `req`.
- Auth must run before the SSE stream opens. `/api/log` streaming is always HTTP 200 after that.
- `GET /api/goals` takes no request argument today. It must take one if the session comes from `req`.
- Provider selection is env over setting. Model selection is setting over env. Per-user settings must not get inverted.
- `claudeChildEnv()` reads `getSetting("claude_oauth_token")`. Per-user env and per-user db resolve together.
- Entry ids are per-file autoincrement. User B missing A's id is a routing fact, not an extra ownership column.
- `connect` does not clear `statusCache`. Per-user cache keys must invalidate on connect, or drop the 30s cache.

## Constraints the design must keep

- Existing meal, foods, goals, history, and AI picker behavior for one signed-in user.
- `resetDbForTests` / temp DB isolation for Vitest.
- Built-in parser when AI is off.
- Do not auto-select OpenAI. Do not pass `ANTHROPIC_API_KEY` into Claude CLI.
- Google SSO only. Persist email and name.
- Each user gets their own database file.
- Each user brings their own Claude subscription.

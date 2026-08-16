# Macro — Calorie Logger

A personal calorie and macro tracker where you log meals the way you'd text a friend — by typing or speaking a sentence like:

> "2 eggs, a bowl of oatmeal and a banana"

The app parses the sentence, figures out calories, protein, carbs, fat (plus fiber, sugar, sodium), and updates your daily dashboard.

## How food lookup works

1. **Local SQLite database first** — the app ships with ~110 common foods and checks exact, alias, and fuzzy name matches.
2. **AI fallback** — if a food isn't in the database, the app searches USDA FoodData Central, Open Food Facts, and the web, then the connected LLM reads those results and returns per-serving nutrition. You can watch the thought process (parse reasoning, search queries, and sources) while a meal is logged.
3. **Caching** — AI results are saved back into SQLite, so each food is only ever looked up once.

Pick a **provider and model** on the Today page or the AI page. Claude Code login is the default; ChatGPT/Codex is next; an OpenAI API key is a paid opt-in and is never selected automatically.

## Features

- **Text and voice logging** — chat-style input with a mic button (browser Web Speech API; Chrome/Edge/Safari)
- **Visible AI thought process** — live steps, model reasoning, and nutrition web-search results while logging
- **Provider and model picker** — Claude, ChatGPT/Codex, or OpenAI API, with a model dropdown per provider
- **Daily dashboard** — calorie ring plus protein/carbs/fat progress bars against your goals
- **History** — per-day totals with expandable entry lists
- **Foods & Goals** — browse/edit the food database (built-in, AI-cached, and custom foods) and set daily targets
- **Editable entries** — fix quantities or delete mistakes; macros recompute automatically

## Getting started

```bash
npm install
# Sign in with Claude Code (uses your subscription, no API key):
claude auth login
npm run dev
```

Open http://localhost:3000. The SQLite database is created and seeded automatically at `data/app.db` on first request.

Without a signed-in CLI, the app still works for foods already in the database (a simple built-in parser handles inputs like "2 eggs and 200g chicken breast"), but unknown foods can't be looked up.

Open **AI** in the app to connect a Claude or ChatGPT subscription from your phone: Claude shows a login link plus a code to paste; ChatGPT uses Codex device-auth (open the page, type the one-time code). No API keys.

The Claude Code and Codex CLIs must be installed **on the computer that runs this app** (the Next.js server), not on your phone. If a CLI is missing, Connect is disabled and the page explains how to install it. `POST /api/ai` `{ action: "connect" }` also refuses to spawn a missing binary.

### Claude subscription (default)

Install [Claude Code](https://code.claude.com) and run `claude auth login`. The app shells out to `claude -p` using that login. Usage counts against your normal Pro/Max limits, shared with claude.ai and interactive Claude Code.

Do **not** set `ANTHROPIC_API_KEY`. If it is exported, `claude -p` bills the API console instead of your subscription. The app strips that variable from the subprocess environment; if the status banner still reports an API-key login, run `unset ANTHROPIC_API_KEY`.

`claude setup-token` into `CLAUDE_CODE_OAUTH_TOKEN` is a fallback for servers with no browser (containers, CI, detached daemons). It prints once, saves nothing, lasts a year, and **does not refresh** — when it expires the app 401s until you regenerate it and restart. Prefer `claude auth login` for local `next dev`.

This is a single-user local tool. Do not host it for other people against your subscription; that is routing Claude through one plan on behalf of users, which Anthropic does not allow.

### Codex (ChatGPT login)

Install the Codex CLI and run `codex login`. Auto-detection uses Codex when Claude is not signed in. Pin it with `AI_PROVIDER=codex`.

### OpenAI API key (opt-in, paid)

Set `AI_PROVIDER=openai` **and** `OPENAI_API_KEY`. This provider is never chosen by auto-detection.

### Environment

See [`.env.example`](.env.example). Useful variables:

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER` | `auto` (default), `claude`, `codex`, `openai`, `none` |
| `AI_CLAUDE_MODEL` | Optional Claude model if the in-app picker has not set one (e.g. `haiku`) |
| `AI_CODEX_MODEL` | Optional Codex model if the in-app picker has not set one |
| `OPENAI_MODEL` | OpenAI model if the in-app picker has not set one (default `gpt-4o-mini`) |
| `USDA_API_KEY` | Optional [FoodData Central](https://fdc.nal.usda.gov/api-guide.html) key; falls back to `DEMO_KEY` |
| `AI_CLI_TIMEOUT_MS` | Subprocess timeout, minimum 20000, default 60000 |
| `CLAUDE_CODE_OAUTH_TOKEN` | Headless fallback; prefer `claude auth login` |
| `OPENAI_API_KEY` | Paid opt-in; requires `AI_PROVIDER=openai` |

Verify a signed-in setup with `npm run ai:doctor`. Unauthenticated CLI wiring can be checked with `npm run ai:cli-smoke`.

## Testing

```bash
npm test          # Vitest unit + API/DB integration suite (includes AI contracts)
npm run test:watch
npm run test:e2e  # Playwright (Today / History / Foods flows)
```

Unit tests cover parsing, normalization, unit conversion, components, and Claude/Codex login contracts (OSC-8 URLs, env sanitization, never auto-selecting OpenAI). Integration tests use an isolated temp SQLite file (`CALORIE_LOGGER_DB_PATH` / `resetDbForTests`) so they never touch `data/app.db`. CLI login tests use fake binaries; they do not call Anthropic or OpenAI. Playwright boots `next dev` against a temp DB with AI disabled.

After you connect a subscription, `npm run ai:doctor` runs a live meal parse. `npm run ai:cli-smoke` checks unauthenticated CLI flags (`--max-turns`, rejection of `--ask-for-approval`).

## Tech stack

- Next.js 16 (App Router, TypeScript) — UI and API routes in one codebase
- SQLite via better-sqlite3 + Drizzle ORM
- Claude Code / Codex CLI structured JSON for meal parsing and nutrition lookup (OpenAI API opt-in)
- USDA FoodData Central + Open Food Facts + DuckDuckGo for live nutrition search
- Tailwind CSS

## API overview

| Route | Purpose |
| --- | --- |
| `POST /api/log` | Parse a meal sentence, resolve foods (DB then web search + AI), create entries. `?stream=1` or `Accept: text/event-stream` streams the thought process as SSE. |
| `GET /api/entries?date=` | Entries + totals + goals for a day |
| `PATCH/DELETE /api/entries/:id` | Edit quantity / delete an entry |
| `GET/POST /api/foods`, `PATCH/DELETE /api/foods/:id` | Food database CRUD |
| `GET/PUT /api/goals` | Daily macro targets |
| `GET /api/history?days=` | Per-day totals |
| `GET /api/status` | Active AI provider, model catalog, and whether lookup is configured |
| `POST /api/ai` | Connect / disconnect logins; `preference` saves provider and model |

# Macro — Calorie Logger

A personal calorie and macro tracker where you log meals the way you'd text a friend — by typing or speaking a sentence like:

> "2 eggs, a bowl of oatmeal and a banana"

The app parses the sentence, figures out calories, protein, carbs, fat (plus fiber, sugar, sodium), and updates your daily dashboard.

## How food lookup works

1. **Local SQLite database first** — the app ships with ~110 common foods and checks exact, alias, and fuzzy name matches.
2. **AI fallback** — if a food isn't in the database, the connected LLM (OpenAI) looks up accurate per-serving nutrition facts.
3. **Caching** — AI results are saved back into SQLite, so each food is only ever looked up once.

## Features

- **Text and voice logging** — chat-style input with a mic button (browser Web Speech API; Chrome/Edge/Safari)
- **Daily dashboard** — calorie ring plus protein/carbs/fat progress bars against your goals
- **History** — per-day totals with expandable entry lists
- **Foods & Goals** — browse/edit the food database (built-in, AI-cached, and custom foods) and set daily targets
- **Editable entries** — fix quantities or delete mistakes; macros recompute automatically

## Getting started

```bash
npm install
cp .env.example .env.local   # add your OpenAI API key
npm run dev
```

Open http://localhost:3000. The SQLite database is created and seeded automatically at `data/app.db` on first request.

Without an `OPENAI_API_KEY`, the app still works for foods already in the database (a simple built-in parser handles inputs like "2 eggs and 200g chicken breast"), but unknown foods can't be looked up.

## Testing

```bash
npm test          # Vitest unit + API/DB integration suite
npm run test:watch
npm run test:e2e  # Playwright (Today / History / Foods flows)
```

Unit tests cover parsing, normalization, unit conversion, and components. Integration tests use an isolated temp SQLite file (`CALORIE_LOGGER_DB_PATH` / `resetDbForTests`) so they never touch `data/app.db`. OpenAI is mocked; no network calls. Playwright boots `next dev` against a temp DB with AI disabled.

## Tech stack

- Next.js 16 (App Router, TypeScript) — UI and API routes in one codebase
- SQLite via better-sqlite3 + Drizzle ORM
- OpenAI structured outputs (JSON schema) for meal parsing and nutrition lookup
- Tailwind CSS

## API overview

| Route | Purpose |
| --- | --- |
| `POST /api/log` | Parse a meal sentence, resolve foods (DB then AI), create entries |
| `GET /api/entries?date=` | Entries + totals + goals for a day |
| `PATCH/DELETE /api/entries/:id` | Edit quantity / delete an entry |
| `GET/POST /api/foods`, `PATCH/DELETE /api/foods/:id` | Food database CRUD |
| `GET/PUT /api/goals` | Daily macro targets |
| `GET /api/history?days=` | Per-day totals |
| `GET /api/status` | Whether AI lookup is configured |

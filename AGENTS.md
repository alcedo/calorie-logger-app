<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install: `npm ci` then `bash scripts/install-ai-clis.sh` (Claude Code + Codex into `~/.local/bin`). Start: `npm run dev -- --hostname 0.0.0.0 --port 3000` (binds for laptop port-forwarding).
- SQLite DB is created/seeded at `data/app.db` on first request. On Vercel, SQLite stays in the ephemeral instance tmpdir (`calorie-logger.db`). Sign in with `claude auth login` (preferred) or `codex login` for AI meal parsing on a machine that can spawn the CLIs. On Vercel, paste a Claude setup-token or connect ChatGPT. Those credentials call the subscription over HTTP. `OPENAI_API_KEY` is a paid fallback. Local `AI_PROVIDER=auto` never selects OpenAI. Without a subscription token, CLI login, or that key, only ~110 built-in foods resolve.
- Smoke check: `POST /api/log` with `{"text":"2 eggs and 200g chicken breast"}`, then `GET /api/entries?date=YYYY-MM-DD`.
- Contract tests for Claude/Codex login (no live subscription required): `npm test`. Live signed-in probe: `npm run ai:doctor`.

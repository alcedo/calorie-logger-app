<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install: `npm ci` then `bash scripts/install-ai-clis.sh` (Claude Code + Codex into `~/.local/bin`). Start: `npm run dev -- --hostname 0.0.0.0 --port 3000` (binds for laptop port-forwarding).
- Per-user SQLite is created/seeded under `data/users/<id>/app.db` after Google sign-in (`AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Each user connects Claude from the AI page — the CLIs must already be on the **server**. `OPENAI_API_KEY` is a paid opt-in (`AI_PROVIDER=openai`) and is never auto-selected. Without a signed-in CLI, only ~110 built-in foods resolve.
- Smoke check (signed-in cookie required): `POST /api/log` with `{"text":"2 eggs and 200g chicken breast"}`, then `GET /api/entries?date=YYYY-MM-DD`.
- Contract tests for Claude/Codex login (no live subscription required): `npm test`. Live signed-in probe: `npm run ai:doctor`.

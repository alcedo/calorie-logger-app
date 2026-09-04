# Synthesized design

Base: candidate 1 (`withUser` + tenant ALS + fail-closed `db`).
The cross-judge picked this. I had picked candidate 3. The disagreement is the dual UserId (Google `sub` vs mint hash) and the hope that every new helper takes a scope argument. One id, derived from email. One wrapper. `db` throws if that wrapper is missing.

## Grafts

From candidate 4:
- `mintTestSession({ email, name })` at `@/lib/auth/session` returns a `Cookie` header string.
- Set `CLAUDE_CONFIG_DIR` after `dropScratchHomes`.
- No HTTP test-login route.
- `Cache-Control: private, no-store` on user responses.

From candidate 3:
- Auth.js JWT `encode` / `getToken({ req })` so Vitest does not call `cookies()`.
- Google provider for production sign-in. Session claims are email and name. `sub` in the JWT is the email hash, not Google's account id.
- Do not forward `process.env.CLAUDE_CODE_OAUTH_TOKEN`.

From candidate 2:
- Offline mint only. Playwright sets the cookie from Node.

## Rejected

- Candidate 3 as base. Two id schemes and per-handler `requireScope`.
- Candidate 2 catalog database.
- `user_id` on one file.
- Process-wide Claude token.

## First implementation step

Session mint, `withUser` on every data route, per-user files under `MACRO_DATA_DIR`, then per-user AI slots.

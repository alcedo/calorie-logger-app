# Synthesized design

Base: candidate 3 (Auth.js JWT + `requireScope` + delete `export const db`).
Candidates 1 and 4 finished on disk after the Other Models limit killed their runners.

## Why this base

Overlapping requests are why the singleton dies. AsyncLocalStorage keeps `db` looking ownerless. A missed wrap is a leak or a 500 in a callback. `UserScope` on the function makes the owner visible. Candidate 2 is the same idea with a catalog, a `UserAi` type, and handler factories. That is more than this app needs. Candidate 3 hides auth, mkdir, and the handle map behind `requireScope` and still deletes the singleton in the same wave.

## Grafts

From candidate 4:
- Export `mintTestSession` from `@/lib/auth/session` so the committed isolation test stays.
- Set `CLAUDE_CONFIG_DIR` / `CODEX_HOME` after `dropScratchHomes`, do not delete that rule.
- Cross-user missing rows stay 404.
- Sign-out is a full navigation.
- No HTTP test-login route.

From candidate 2:
- Do not forward `process.env.CLAUDE_CODE_OAUTH_TOKEN` into user CLI children.
- No Credentials provider. Mint is offline `encode` only.
- Exclusive legacy claim (`wx` file), not "catalog empty".

From candidate 1:
- A test that every data route handler goes through `requireScope` / `withUser`.
- `Cache-Control: private, no-store` on user JSON.

## Rejected

- ALS + keep `import { db }` (1 and 4). Smallest diff, invisible owner, SSE and timers have to remember the scope.
- Candidate 2 catalog and `TestAppRuntime` factories. Opaque ids are nice. A second identity database is not earned.
- HTTP `POST /api/auth/test-login`. That is a login method in the bundle.
- `user_id` on one file.

## Contract the code must match

- `AppUser` is `{ id, email, name }`. Production `id` is Google `sub`. Mint `id` is a hash of the email.
- Session from `getToken({ req })`, not `cookies()` from `next/headers`.
- `requireScope(req)` returns `UserScope { user, db, home }` or null. Routes return 401.
- `logMeal`, settings, food-lookup, and AI take `db` or `scope`. Zero-argument `db` is gone.
- Handles live in `Map<UserId, Handle>`. Files at `data/users/<id>/{app.db,claude,codex}`.
- `resetDbForTests(path)` opens that path for a vitest user and does not revive a process singleton for routes.

## First implementation step

`mintTestSession` plus `requireScope` on every data route, with `setupTempDatabase` attaching one minted cookie so today's tests still hit one file. Then split files so the two-user test turns green.

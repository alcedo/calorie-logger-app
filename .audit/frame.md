# Multi-user frame

## Exit predicate

Done when every item is true on the real app and in committed tests.

1. Unauthenticated calls to `/api/log`, `/api/entries`, `/api/entries/:id`, `/api/foods`, `/api/foods/:id`, `/api/goals`, `/api/history`, `/api/status`, and `/api/ai` return 401. Auth callback and sign-in routes stay public.
2. A committed test mints two users. User A logs a meal. User B's day entries do not include that meal. User B cannot PATCH or DELETE A's entry id.
3. A and B use different SQLite files. A's `entries` table does not contain B's rows.
4. Production sign-in is Google only. Requested scopes are `openid email profile`. We store email and name. No Google avatar, locale, or refresh-token dump.
5. User A can connect a Claude subscription. User B's `/api/status` does not treat A's Claude as available. B's meal parse does not use A's CLI credentials or config dir.
6. An authenticated user can still log `2 eggs and 200g chicken breast` and see it on Today and History with the built-in parser.
7. `npm test` exits 0.
8. The UI shows a Google sign-in page when logged out, the user's name when logged in, and a working sign-out.
9. README and `.env.example` name `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.

## Scope

About 12 API routes, the global SQLite singleton, settings, AI login/status/env, four pages plus Nav, test helpers, Playwright, verify-macro, and docs.

This environment has no Google OAuth client. Live Google click-through cannot be proven here. Tests mint a signed session. That mint is off unless an explicit test env flag is set.

## Rigor

High. Isolation and credential split are one-way doors. Gates are isolation tests, the existing Vitest suite, and a signed-in UI pass on verify-macro.

## Tradeoffs already taken

- Separate SQLite files per user, not a `user_id` column on the current file. The request asked for each user to have their own database.
- Test session mint for CI and this cloud box. Production refuses that path.
- First Google login creates the user and seeds their file. If a legacy `data/app.db` exists and the catalog is empty, the first user adopts it.

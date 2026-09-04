# Designed workflow

Units, each ending in a check. Do not start the next until the current one is green.

1. Isolation harness. Failing tests for 401 and two-user split. Check: tests exist and fail for the right reason.
2. Identity and session. Google OAuth plus test mint. Check: session tests green.
3. Per-user SQLite. Catalog + request-scoped db. Check: two files, `resetDbForTests` still works.
4. Gate every data API on the session. Check: unauth 401, existing integration tests pass with a minted session.
5. Per-user Claude. Config dir, login map, status cache. Check: A’s Claude does not appear on B.
6. UI sign-in, name, sign-out. Check: verify-macro and Playwright on a minted session.
7. Docs. README and `.env.example`. Check: the named env vars appear.
8. Full predicate pass. `npm test`, isolation script, signed-in UI log of `2 eggs and 200g chicken breast`.

Fan-out: none on the implementation branch. Shared writes are `src/db`, `src/lib/ai`, and the API tree. Arena sketches write to `/tmp/arena-multi-user/candidate-*` only.

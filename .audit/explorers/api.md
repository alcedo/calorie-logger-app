# Explorer: API request path

- No proxy.ts or middleware. No cookie or Authorization check.
- POST /api/log: 400 no text, 422 empty parse (JSON), SSE always HTTP 200.
- Entry and food ids have no owner. PATCH/DELETE by integer id.
- GET /api/status returns AiStatusDto including all in-flight AI logins.
- POST /api/ai actions are process-global.
- UI today is local calendar. API date fallback is UTC.
- Every integration test, Playwright, verify-macro, and AGENTS.md smoke assumes open APIs.
- 401 on GET /api/status breaks Today banners and verify-macro doctor unless those tools mint a session.

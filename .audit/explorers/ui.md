# Explorer: UI

- All four pages are client components. fetch on mount. No localStorage.
- Nav has no identity slot. Layout has no session.
- fetch already uses same-origin cookies. A session cookie will ride.
- Pages do not handle 401. entries/foods undefined will throw.
- History dayEntries cache and AI setup-token state leak across a same-tab identity change. Logout should full-reload.
- GET /api/status.logins can hydrate another user's Claude URL in any tab.
- Playwright and verify-macro are cookie-less and serial on one DB.

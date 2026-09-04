# Explorer: AI auth

- One CLI home, one settings token, one login Map, one 30s statusCache.
- startClaudeLogin cancelProvider kills every in-flight Claude login.
- claudeChildEnv deletes CLAUDE_CONFIG_DIR when it is under /tmp.
- CLAUDE_CODE_OAUTH_TOKEN env beats settings and survives disconnect.
- AI_PROVIDER env beats in-app preference.
- GET /api/status leaks sessionId, loginUrl, Codex userCode.
- Smoke script already isolates CLI homes. Production spawn does not.
- Per-user homes must not live under /tmp unless dropScratchHomes changes.
- OpenAI is one process key. USDA key is shared search quota.

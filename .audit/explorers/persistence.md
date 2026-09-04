# Explorer: persistence

- One SQLite file. No users table. Goals is row id=1. Settings keys are unique globally.
- Path: explicit arg, CALORIE_LOGGER_DB_PATH, Vercel tmpdir, else data/app.db.
- `db` Proxy + globalThis handles. resetDbForTests mutates env. Vitest fileParallelism is false.
- CREATE TABLE IF NOT EXISTS is not a migrator. Existing files do not gain new columns.
- Second user on the same process shares entries, goals, foods (UNIQUE normalized_name), settings, and the Claude token.
- Vercel tmpdir is one file per isolate, ephemeral, split-brain across isolates.

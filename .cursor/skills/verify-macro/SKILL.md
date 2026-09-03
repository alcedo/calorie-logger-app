---
name: verify-macro
description: Drive the Macro calorie-logger web UI (Today, History, Foods, AI) on an isolated Next.js instance and capture proof. Use when verifying meal logging, dashboard totals, history, food/goal edits, or AI settings — not for unit tests or the shared laptop-forwarded :3000 server.
---

# Verify Macro

Macro is a single-user Next.js calorie logger. The primary surface is the web UI at `/` (Today), `/history`, `/foods`, and `/ai`. REST routes exist for the same data; they are a second view for persistence, not a substitute for the user path.

Put `control-macro` on `PATH` (or invoke it as `.cursor/skills/verify-macro/bin/control-macro` from the repo root). Every command below is literal.

## Launch

Never attach to an already-running `next dev` (including the Cloud Agent default on `localhost:3000`). That process uses `data/app.db` and is not isolated.

Start a disposable instance with a unique SQLite file and a free loopback port:

```bash
control-macro launch
# optional: control-macro launch --port 4173 --host 127.0.0.1 --run-id $RUN_ID
eval "$(control-macro launch | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);console.log(j.export)})')"
```

`launch` prints JSON including `url`, `dbPath`, `state`, and `export`. Run the `export MACRO_VERIFY_STATE=...` line (or set it from the JSON) so later commands talk to this run.

Ready when `GET $URL` and `GET $URL/api/status` answer. The Next log is `$TMP/macro-verify-$RUN_ID/next.log`. The browser daemon needs Playwright Chromium (`npx playwright install chromium` from the repo root if launch fails on the daemon). Env pinned by launch:

- `CALORIE_LOGGER_DB_PATH` — disposable file; first request seeds ~110 built-in foods and default goals (2000 / 120 / 225 / 65)
- `AI_PROVIDER=none` — built-in parser only; unknown foods do not resolve
- `AI_CLAUDE_BIN` / `AI_CODEX_BIN` — fake paths so Connect stays disabled
- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` cleared

Host must stay `127.0.0.1` for the whole run. Next.js in this repo blocks mixing `127.0.0.1` and `localhost` (same as Playwright e2e). Default port is `4173` or the next free port; never steal `:3000`.

Launch sets `NEXT_DIST_DIR=.next-verify-$RUN_ID` so this instance does not fight the lock in `.next` (Cloud Agent `npm run dev` on `:3000` keeps that lock). Cleanup deletes that dist dir. Two verification instances can run side by side if each has its own `--port`, `--run-id`, and therefore its own dist dir. Do not point two runs at the same DB path.

Teardown is `control-macro cleanup` (see Cleanup). That is also how a short-lived run ends; there is no CLI/TUI binary to keep around.

## Doctor

Read-only. Run this first whenever anything looks off, and after every launch:

```bash
control-macro doctor
```

Pass only when all of these hold:

- the Next pid and browser daemon pid from this run are alive
- `$URL` returns HTTP 200
- `GET $URL/api/status` has `bannerKind: "none"`
- the SQLite file is the disposable path from `launch`, not `data/app.db`

Refuse to drive any instance that fails doctor or that you did not start with `control-macro launch`.

## Drive

Harness is headless Chromium held by the launch daemon, plus HTTP for a second read of stored values.

```bash
control-macro browser goto --path /
control-macro browser fill --placeholder "What did you eat" --value "2 eggs and 200g chicken breast"
control-macro browser click --role button --name Log --exact
control-macro browser wait --text Egg --timeout 20000
control-macro browser screenshot --path artifacts/log-meal/after.png
control-macro browser snapshot --aria --path artifacts/log-meal/after.aria.txt
control-macro http get --path /api/entries?date=YYYY-MM-DD
control-macro http post --path /api/log --json '{"text":"2 eggs and 200g chicken breast","date":"YYYY-MM-DD"}'
```

Stable handles from this UI (prefer these over CSS or coordinates):

- Nav links named `Today`, `History`, `Foods`, `AI`; brand link `Macro`
- Today composer: placeholder `What did you eat`; button `Log` (exact; becomes `Logging…` while busy)
- Voice button `Log by voice` — Chrome Web Speech only; skip in this harness
- AI-off banner text `/AI is not configured/i` (full copy mentions connecting Claude or ChatGPT on the AI page) linking to `/ai`
- Combobox `AI provider` on Today and `/ai`
- Foods search placeholder `Search foods…`; row buttons `Edit`, `Save`, `Cancel`, `Delete`
- Spinbuttons labeled `Calories`, `Protein (g)`, and the goals fields `Calories (kcal)`, `Protein (g)`, `Carbs (g)`, `Fat (g)`
- Goals submit `Save goals` (label becomes `Saved ✓` briefly)
- Entry quantity is a button showing `{qty} {unit}`; delete control `Delete {foodName}`
- History: heading `History`; each day is a `ul li button`

Read `.cursor/skills/verify-macro/features/README.md` and the matching feature file before driving. A proof that hits one convenient entry point is incomplete when the map lists others.

Canonical AI-off smoke phrase (built-in parser, seeded foods): `2 eggs and 200g chicken breast` → list rows `Egg` and `Chicken Breast`, dashboard calories `474` (2×72 + 2×165). Thought process shows `built-in parser`.

Date rule: the Today UI sends `todayLocalDate()` (local calendar). `POST /api/log` without `date` uses UTC `toISOString().slice(0,10)`. Always pass `date` on HTTP logs, and assert entries with the same local date the UI used.

## Evidence

Write proof under `.cursor/skills/verify-macro/artifacts/<feature>/`. `control-macro cleanup` must not delete that tree.

Proof standards:

- Exercise the real user path (type in the composer, click `Log`, use nav links). Do not treat `POST /api/log` or test-only helpers as the Today proof. HTTP is the second view that the row landed in SQLite.
- Capture the action and the resulting state: before (empty Today / banner), the filled composer or the click, then the list + dashboard. An after-only screenshot is not enough.
- Verify side effects: `GET /api/entries?date=<local>` must contain the same food names and calorie total the UI shows. After a food or goal edit, re-read `/api/foods?q=` or `/api/goals`.
- This launch pins `AI_PROVIDER=none`. Do not mock the parser. Unknown foods stay unresolved; that is the production boundary. Live Claude/Codex login is out of scope for this isolated harness (`npm run ai:doctor` is the live probe, and it is not this skill).

Minimum files per verified feature:

- `before.png` and `after.png` (app title `Macro — Calorie Logger` visible)
- `after.aria.txt` from `browser snapshot --aria`
- `entries.json` (or `goals.json` / `foods.json`) from `http get`

Record the feature ID and entry point in the artifact filenames or a sibling `proof.txt`.

## Cleanup

```bash
control-macro cleanup
```

Kills only the Next pid and browser-daemon pid stored in `MACRO_VERIFY_STATE`. Never `pkill -f next` or anything by process name. Removes the temp dir (DB, logs, socket state). Leaves `.cursor/skills/verify-macro/artifacts/` in place.

If a drive fails, run cleanup before the next launch so ports and Chromium do not leak.

## Helpers

`control-macro` is executable at `.cursor/skills/verify-macro/bin/control-macro` and delegates to `scripts/control-macro.mjs`.

```bash
control-macro launch
control-macro doctor
control-macro browser goto --path /
control-macro browser click --role link --name History
control-macro browser fill --placeholder "Search foods…" --value Egg
control-macro browser wait --text "Food database"
control-macro browser screenshot --path artifacts/<feature>/after.png
control-macro browser snapshot --aria --path artifacts/<feature>/after.aria.txt
control-macro http get --path /api/status
control-macro cleanup
```

Do not add flags. If a selector is missing from the list above, read the feature map — do not guess CSS.

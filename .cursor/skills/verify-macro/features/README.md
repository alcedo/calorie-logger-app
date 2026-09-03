# Macro verification map

This directory is the maintained source for verifying the user-facing behavior of Macro. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch Macro with `control-macro launch` (isolated DB, `AI_PROVIDER=none`, loopback host `127.0.0.1`).
- Export `MACRO_VERIFY_STATE` from the launch JSON.
- Run `control-macro doctor` and require the printed URL, disposable `dbPath`, and `bannerKind: "none"`.
- Never drive `localhost:3000` or any instance that was not started by this verification run.
- Seeded foods include `Egg` (72 kcal / large egg) and `Chicken Breast` (165 kcal / 100 g). Default goals are 2000 kcal, 120 g protein, 225 g carbs, 65 g fat.
- Restore mutated foods and goals after a recipe. Do not remove proof artifacts during cleanup.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles, accessible names, and placeholders over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `control-macro browser`.
- Run persistence checks through `control-macro http`.
- Use the local calendar date (`YYYY-MM-DD`) for every `/api/entries` and `/api/log` call.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the Macro identity visible.
- HTTP proof includes the request path, status, and JSON body.
- Mutation proof includes a read-only second view of the stored value.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-macro` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Log a meal](./log-meal.md) covers Today composer logging, the calorie ring, thought process, and persistence.
- [History](./history.md) covers the day list, expanding a day, and seeing the same entries.
- [Foods and goals](./foods-and-goals.md) covers food search, inline edit, and daily goal save.
- [AI connections](./ai-connections.md) covers the AI-off banner, provider pickers, and disabled Connect controls on this harness.
- [Edit or delete an entry](./edit-entry.md) covers quantity edits and deleting a logged row.

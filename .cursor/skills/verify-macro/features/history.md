# History

History lists each logged day with calorie totals and lets the user expand a day to see the same entry rows as Today.

## Sub-features

- `history-empty` shows the empty copy when no days exist.
- `history-list` shows a day summary after a meal is logged.
- `history-expand` loads that day's foods in place.

## How to get to it (user POV)

- Choose the `History` nav link from the header.
- Open `/history` directly.

## Driving it with control-macro

Preconditions:

- Macro is healthy at the launch URL.
- For `history-empty`, the disposable DB has no entries.
- For `history-list` and `history-expand`, Today already has the smoke meal (`Egg`, `Chicken Breast`, 474 kcal) from [log-meal](./log-meal.md).

- **Empty state.** With no entries, run `control-macro browser goto --path /history`. The heading `History` appears and the copy `No logged days yet — start on the Today tab.` is visible.
- **Open History after a log.** Run `control-macro browser click --role link --name History`. A day button is visible (formatted like `Thu, Sep 3`) with `2 items` and `474 kcal`.
- **Expand the day.** Choose the first day button. Run `control-macro browser click --selector "ul li button"`. `Egg` and `Chicken Breast` appear in the expanded list.
- **Second view.** Run `control-macro http get --path /api/history?days=60`. HTTP 200 and `days[0]` has `entryCount` 2 and `calories` 474.
- **Proof.** Run `control-macro browser screenshot --path artifacts/history/after.png` and `control-macro browser snapshot --aria --path artifacts/history/after.aria.txt`. Both show the History heading, the day total, and the expanded foods.

## Gotchas

- History is empty until something is logged. Do not treat a fresh launch as a list failure.
- Day labels are locale-formatted (`weekday, month day`), not raw `YYYY-MM-DD`. Assert `474 kcal` or the food names, not a hardcoded weekday string.
- Expanding a day fetches `/api/entries?date=`. Wait for `Egg`, not a fixed sleep.
- The first `ul li button` is the day row. Do not confuse it with quantity or delete controls inside an expanded list.

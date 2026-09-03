# Log a meal

Log a meal lets a user type what they ate on Today, see the foods and calories land on the dashboard, and confirm the same rows from a second read of the day.

## Sub-features

- `log-open` shows an empty Today with the AI-off banner and composer.
- `log-submit` parses a seeded-food sentence and lists each food.
- `log-dashboard` updates the calorie ring to the summed kcal.
- `log-thought` shows the built-in parser in Thought process.
- `log-persist` returns the same foods from `GET /api/entries`.

## How to get to it (user POV)

- Open Macro; the default route is Today (`/`).
- Choose the `Today` nav link from any other tab.
- Choose the `Macro` brand link in the header.

## Driving it with control-macro

Preconditions:

- Macro is healthy at the launch URL (`control-macro doctor` passes).
- No entries exist for today's local date.
- The disposable DB still has seeded `Egg` and `Chicken Breast`.

- **Open Today.** Go to the default route. Run `control-macro browser goto --path /`. The heading `Today's food` appears, the empty copy `Nothing logged yet. Tell me what you ate below.` is visible, and a banner matching `AI is not configured` is visible.
- **Capture empty state.** Run `control-macro browser screenshot --path artifacts/log-meal/before.png`. The screenshot shows Macro, the empty list, and the composer placeholder.
- **Enter the smoke sentence.** Type in the composer. Run `control-macro browser fill --placeholder "What did you eat" --value "2 eggs and 200g chicken breast"`. The `Log` button enables.
- **Submit.** Choose `Log`. Run `control-macro browser click --role button --name Log --exact`. The button may show `Logging…` then return to `Log`.
- **See foods.** Wait for both rows. Run `control-macro browser wait --text Egg --timeout 20000` and `control-macro browser wait --text "Chicken Breast" --timeout 20000`. A chat bubble starting with `Logged:` appears.
- **See calories and thought process.** The dashboard shows `474` and `/ 2000 kcal`. Run `control-macro browser wait --text "Thought process"` and `control-macro browser wait --text "built-in parser"`.
- **Confirm persistence.** Read the day back. Run `control-macro http get --path /api/entries?date=YYYY-MM-DD` using today's local date. HTTP 200, `entries` contains `Egg` and `Chicken Breast`, and `totals.calories` is `474`.
- **Proof.** Run `control-macro browser snapshot --aria --path artifacts/log-meal/after.aria.txt` and `control-macro browser screenshot --path artifacts/log-meal/after.png`. Both identify Macro, `Egg`, `Chicken Breast`, and `474`. Save the JSON body as `artifacts/log-meal/entries.json`.

## Gotchas

- Voice (`Log by voice`) is a separate feature. See [voice-log.md](./voice-log.md). Do not treat a typed log as voice proof.
- `POST /api/log` is not the Today entry point. Use it only as a second view, and always send `date` as the local calendar day.
- Unknown foods stay unresolved while `bannerKind` is `none`. Do not use novel brand names as the smoke sentence.
- `Log` is disabled while the textarea is empty. Fill before click.
- Near UTC midnight, a dateless HTTP log can land on a different day than Today. The UI date wins for this feature.

# Log by voice

Log by voice lets a user speak a meal sentence into Today's composer. The browser Speech Recognition API fills the same textarea as typing; submitting `Log` then uses the same parser and dashboard as a typed meal.

This harness cannot open a real microphone. Launch installs a `SpeechRecognition` stub so the mic control is visible. `control-macro browser speech --value` is the spoken transcript at that production boundary.

## Sub-features

- `voice-mic` shows `Log by voice` on Today when speech is available.
- `voice-listen` switches the composer to listening after the mic click.
- `voice-transcript` puts the spoken sentence into the composer and leaves listening.
- `voice-submit` logs that sentence and lists the same foods as a typed smoke meal.

## How to get to it (user POV)

- Open Macro; the default route is Today (`/`).
- Choose the mic control next to the composer (`Log by voice`).
- Speak a meal, then choose `Log` (or press Enter) once the text is in the box.

## Driving it with control-macro

Preconditions:

- Macro is healthy at the launch URL (`control-macro doctor` passes).
- No entries exist for today's local date.
- The disposable DB still has seeded `Egg` and `Chicken Breast`.
- This instance was started with `control-macro launch` (speech stub on the verification Chromium context).

- **Open Today.** Run `control-macro browser goto --path /`. The heading `Today's food` appears. The mic control `Log by voice` is visible. The composer placeholder still matches `What did you eat`.
- **Capture empty state.** Run `control-macro browser screenshot --path artifacts/voice-log/before.png`. The screenshot shows Macro, the empty list, and the mic button.
- **Start listening.** Choose the mic. Run `control-macro browser click --role button --name "Log by voice"`. Run `control-macro browser wait --placeholder "Listening"`. The control's accessible name is now `Stop listening`.
- **Capture listening.** Run `control-macro browser screenshot --path artifacts/voice-log/listening.png`.
- **Deliver the spoken sentence.** Stand in for Chrome speech. Run `control-macro browser speech --value "2 eggs and 200g chicken breast"`. Listening ends. The composer holds that sentence and the placeholder returns to `What did you eat`. `Log` enables.
- **Submit.** Choose `Log`. Run `control-macro browser click --role button --name Log --exact`. The button may show `Logging…` then return to `Log`.
- **See foods.** Wait for both rows. Run `control-macro browser wait --text Egg --timeout 20000` and `control-macro browser wait --text "Chicken Breast" --timeout 20000`. A chat bubble starting with `Logged:` appears. The dashboard shows `474` and `/ 2000 kcal`. Thought process shows `built-in parser`.
- **Confirm persistence.** Read the day back. Run `control-macro http get --path /api/entries?date=YYYY-MM-DD` using today's local date. HTTP 200, `entries` contains `Egg` and `Chicken Breast`, and `totals.calories` is `474`.
- **Proof.** Run `control-macro browser snapshot --aria --path artifacts/voice-log/after.aria.txt` and `control-macro browser screenshot --path artifacts/voice-log/after.png`. Both identify Macro, `Egg`, `Chicken Breast`, and `474`. Save the JSON body as `artifacts/voice-log/entries.json`. Record `voice-log` and entry point `Today mic` in `artifacts/voice-log/proof.txt`.

## Gotchas

- `browser speech` fails with "not listening" unless you clicked `Log by voice` first. Do not call it on a cold page.
- Filling the placeholder with `browser fill` is typed input. That is `log-meal`, not this feature.
- Headless Chromium has no live Web Speech or microphone. The launch stub is required; a headed Chrome with a real mic is out of scope for this recipe.
- The same smoke sentence as typed logging is required so calories stay `474`. Novel brand names stay unresolved while `bannerKind` is `none`.
- `Log` stays disabled until the transcript lands. Wait for the placeholder to leave `Listening` before clicking `Log`.
- Near UTC midnight, a dateless HTTP log can land on a different day than Today. The UI date wins for this feature.

# Foods and goals

Foods and goals lets a user browse the food database, change a food's nutrition, and set daily calorie and macro targets.

## Sub-features

- `foods-search` filters the list by name.
- `foods-edit` saves a calorie change on a built-in food.
- `goals-save` writes new daily targets and they persist on reload.

## How to get to it (user POV)

- Choose the `Foods` nav link from the header.
- Open `/foods` directly.

## Driving it with control-macro

Preconditions:

- Macro is healthy at the launch URL.
- Seeded `Egg` is still 72 kcal unless this recipe changed it.
- Daily goals are still 2000 / 120 / 225 / 65 unless this recipe changed them.

- **Open Foods.** Run `control-macro browser goto --path /foods`. The heading `Daily goals` and the text `Food database` are visible.
- **Search.** Type in the search field. Run `control-macro browser fill --placeholder "Search foods…" --value Egg`. A row named `Egg` with badge `built-in` remains; unrelated foods disappear.
- **Edit calories.** Choose `Edit` on the first matching row. Run `control-macro browser click --role button --name Edit`. Fill the `Calories` spinbutton. Run `control-macro browser fill --role spinbutton --name Calories --exact --value 80`. Choose `Save`. Run `control-macro browser click --role button --name Save --exact`. The row shows `80 kcal`.
- **Confirm food persist.** Run `control-macro http get --path /api/foods?q=Egg`. The `Egg` object has `calories` 80.
- **Restore Egg.** Repeat edit and set `Calories` back to `72`, then Save. The row shows `72 kcal` again.
- **Change goals.** Fill `Calories (kcal)` with `1800`. Run `control-macro browser fill --label "Calories (kcal)" --value 1800`. Choose `Save goals`. Run `control-macro browser click --role button --name "Save goals"`. The button may flash `Saved ✓`.
- **Confirm goals persist.** Run `control-macro http get --path /api/goals`. `goals.calories` is `1800`. Reload Foods and check the field still shows `1800`.
- **Restore goals.** Set calories back to `2000` and save so later recipes keep the baseline.
- **Proof.** Run `control-macro browser screenshot --path artifacts/foods-and-goals/after.png` and `control-macro browser snapshot --aria --path artifacts/foods-and-goals/after.aria.txt` after the visible edit (80 kcal or restored 72) so the food name and kcal are on screen.

## Gotchas

- Several rows can show `Edit`. Search first so the first `Edit` is the intended food.
- `Calories` (food editor) and `Calories (kcal)` (goals) are different fields. Use `--exact` on the food spinbutton.
- Search debounces ~200 ms. Wait for the `Egg` row, not a fixed sleep.
- Leaving Egg at 80 kcal changes later log math. Always restore 72 before cleanup.
- `Delete` on a seeded food is destructive for the rest of the run. Do not delete `Egg` or `Chicken Breast` during verification.

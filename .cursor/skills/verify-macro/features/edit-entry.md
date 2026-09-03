# Edit or delete an entry

Edit or delete lets a user fix a logged quantity (macros recompute) or remove a mistaken row from Today's food.

## Sub-features

- `entry-edit-qty` changes quantity and updates kcal on the row and the ring.
- `entry-cancel-edit` leaves the stored quantity unchanged.
- `entry-delete` removes the row and drops its calories from the day total.

## How to get to it (user POV)

- On Today, choose the quantity text under a food (`{qty} {unit}`).
- On Today, choose the delete control for that food (`Delete {foodName}`).
- On History, expand a day and use the same quantity and delete controls.

## Driving it with control-macro

Preconditions:

- Macro is healthy at the launch URL.
- Today already has the smoke meal: `Egg` at quantity `2` unit `serving` and `Chicken Breast` at `200` unit `g`, day total `474`.

- **Open Today.** Run `control-macro browser goto --path /`. `Egg` and `2 serving` are visible.
- **Start edit.** Choose the Egg quantity. Run `control-macro browser click --role button --name "2 serving"`. An input appears with `Save` and `Cancel`.
- **Cancel.** Run `control-macro browser click --role button --name Cancel`. The quantity is still `2 serving` and the ring still shows `474`.
- **Change quantity.** Open the Egg quantity again. Run `control-macro browser click --role button --name "2 serving"`. Fill the quantity field. Run `control-macro browser fill --selector "input[autofocus], li input" --value 1`. Choose `Save`. Run `control-macro browser click --role button --name Save`. The row shows `1 serving` and about `72` kcal. The ring is `402` (72 + 330).
- **Confirm persist.** Run `control-macro http get --path /api/entries?date=YYYY-MM-DD`. The Egg entry has `quantity` 1 and `calories` 72. `totals.calories` is `402`.
- **Delete Chicken Breast.** Run `control-macro browser click --role button --name "Delete Chicken Breast"`. That row disappears. The ring shows `72`.
- **Confirm delete.** Run `control-macro http get --path /api/entries?date=YYYY-MM-DD`. Only `Egg` remains.
- **Proof.** After the quantity save (before or after delete), run `control-macro browser screenshot --path artifacts/edit-entry/after.png` and `control-macro browser snapshot --aria --path artifacts/edit-entry/after.aria.txt`. The artifacts show the new quantity and kcal.

## Gotchas

- Quantity is a button, not a textbox, until you click it. The accessible name is the current `{qty} {unit}` string (`2 serving` for the smoke Egg row, not `Egg`).
- `Save` on an entry conflicts with Foods `Save` if you are on the wrong page. Stay on Today.
- Macros recompute from the linked food. Do not assert a hand-scaled float beyond one decimal.
- Delete is immediate — no confirm dialog. Capture the before screenshot first.
- History reuses the same `EntryList`. Verifying only Today does not cover the History entry point listed above.

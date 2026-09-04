# AI connections

AI connections shows whether lookup is configured, lets the user pick a provider and model, and (on a machine with the CLIs installed) starts a Claude or ChatGPT login. This harness launches with AI off and fake CLI paths, so Connect stays disabled.

## Sub-features

- `ai-banner` surfaces the AI-off banner on Today and links to `/ai`.
- `ai-page` shows Claude, ChatGPT, and the provider/model pickers.
- `ai-connect-blocked` keeps Connect disabled when the CLI is missing.
- `ai-picker` exposes the `AI provider` combobox on Today and on `/ai`.

## How to get to it (user POV)

- Choose the `AI` nav link from the header.
- Choose `Connect AI` on the Today banner (`AI is not configured`).
- Open `/ai` directly.
- Use the compact `AI provider` picker on Today.

## Driving it with control-macro

Preconditions:

- This instance was started with `control-macro launch` (`AI_PROVIDER=none`, fake CLI bins).
- `control-macro doctor` reports `bannerKind: "none"`.

- **Today banner.** Run `control-macro browser goto --path /`. A banner matching `AI is not configured` is visible and contains `Connect AI`.
- **Banner entry.** Choose `Connect AI`. Run `control-macro browser click --role link --name "Connect AI"`. The heading `AI connections` appears.
- **Nav entry.** From Today, run `control-macro browser click --role link --name AI`. The same `AI connections` heading appears, plus `Provider and model`.
- **Pickers.** Run `control-macro browser wait --label "AI provider"`. Comboboxes `claude model` and `codex model` are visible on this page.
- **Connect blocked.** Run `control-macro browser wait --text "CLI not installed"`. `Connect Claude` and `Connect ChatGPT` are disabled. Copy matching `Install the CLI on that computer` is visible.
- **Status second view.** Run `control-macro http get --path /api/status`. `bannerKind` is `none`. Claude and Codex providers report `cliInstalled` false.
- **Proof.** Run `control-macro browser screenshot --path artifacts/ai-connections/after.png` and `control-macro browser snapshot --aria --path artifacts/ai-connections/after.aria.txt`. Both show `AI connections`, disabled Connect buttons, and `CLI not installed`.

## Gotchas

- This skill does not complete a live Claude or ChatGPT login. Do not start `connect` against a real CLI here; use `npm run ai:doctor` outside this harness.
- Connect is disabled because launch points `AI_CLAUDE_BIN` and `AI_CODEX_BIN` at missing files. A developer machine with real CLIs on PATH is a different configuration — do not treat that as this recipe.
- OpenAI API is a paid opt-in. Local auto never selects it. The OpenAI option stays disabled without `OPENAI_API_KEY`.
- A `VERCEL=1` host is a different configuration. Connect Claude stays hidden. Setup-token and Connect ChatGPT stay visible. Do not use this launch recipe as the Vercel proof.
- The Today banner is a link. The accessible name to click is `Connect AI`, not the whole banner paragraph.

#!/usr/bin/env bash
# Install Claude Code and Codex CLIs into ~/.local/bin (idempotent).
# Used by Cloud Agent environment setup and local machines that host Macro.
set -euo pipefail

export PATH="${HOME}/.local/bin:${PATH}"
mkdir -p "${HOME}/.local/bin"

echo "==> Installing Claude Code CLI"
curl -fsSL https://claude.ai/install.sh | bash

echo "==> Installing Codex CLI"
curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh

if ! command -v claude >/dev/null 2>&1; then
  echo "claude was not found on PATH after install (expected ${HOME}/.local/bin/claude)" >&2
  exit 1
fi
if ! command -v codex >/dev/null 2>&1; then
  echo "codex was not found on PATH after install (expected ${HOME}/.local/bin/codex)" >&2
  exit 1
fi

echo "==> claude $(claude --version 2>/dev/null || true)"
echo "==> codex $(codex --version 2>/dev/null || true)"
echo "CLIs are installed. Sign in with \`claude auth login\` and/or \`codex login\` (Connect in the app) before AI lookups work."

#!/usr/bin/env node
/**
 * Stand-in for `codex login --device-auth`.
 * Prints the colored device-auth screen Codex 0.147.0 emits, then hangs
 * until SIGTERM (the app polls until the user finishes in the browser).
 */
const output = [
  "",
  "Welcome to Codex [v0.147.0]",
  "OpenAI's command-line coding agent",
  "",
  "Follow these steps to sign in with ChatGPT using device code authorization:",
  "",
  "1. Open this link in your browser and sign in to your account",
  "   \x1b[94mhttps://auth.openai.com/codex/device\x1b[0m",
  "",
  "2. Enter this one-time code \x1b[90m(expires in 15 minutes)\x1b[0m",
  "   \x1b[94mUBN6-U35TZ\x1b[0m",
  "",
].join("\n");

process.stdout.write(output);
setInterval(() => {}, 1 << 30);

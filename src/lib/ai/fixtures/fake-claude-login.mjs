#!/usr/bin/env node
/**
 * Stand-in for `claude auth login --claudeai`.
 * Prints the OSC-8 wrapped authorize URL Claude Code emits when TERM looks
 * capable (the production timeout we hit under tmux), then waits for a code.
 */
import { writeFileSync } from "node:fs";

const url =
  "https://claude.com/cai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile&code_challenge=abc&code_challenge_method=S256&state=xyz";

if (process.env.MACRO_TEST_ENV_DUMP) {
  writeFileSync(
    process.env.MACRO_TEST_ENV_DUMP,
    JSON.stringify({
      TERM: process.env.TERM ?? null,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? null,
      ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN ?? null,
      DISPLAY: process.env.DISPLAY ?? null,
      TMUX: process.env.TMUX ?? null,
      BROWSER: process.env.BROWSER ?? null,
    }),
  );
}

process.stdout.write(
  `Opening browser to sign in…\nIf the browser didn't open, visit: \x1b]8;;${url}\x07${url}\x1b]8;;\x07\nPaste code here if prompted > `,
);

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  if (buf.includes("\n")) {
    process.exit(buf.trim() === "good-code" ? 0 : 1);
  }
});

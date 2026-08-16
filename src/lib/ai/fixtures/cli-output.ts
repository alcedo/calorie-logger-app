/**
 * Captured CLI stdout. Keep these aligned with Claude Code 2.1.233 /
 * Codex 0.147.0. If a CLI upgrade changes login text, update the parser
 * tests AND these fixtures in the same change.
 */

export const CLAUDE_LOGIN_PLAIN = [
  "Opening browser to sign in…",
  "If the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&client_id=abc&state=xyz",
  "Paste code here if prompted > ",
].join("\n");

/** What Claude prints when TERM=tmux-256color even if stdout is a pipe. */
export const CLAUDE_LOGIN_OSC8 = (() => {
  const url =
    "https://claude.com/cai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference+user%3Asessions%3Aclaude_code+user%3Amcp_servers+user%3Afile_upload&code_challenge=G6Yj7zkAyTviPRBNtYPcXsUOCADu5WtcU1DGKq7woDo&code_challenge_method=S256&state=LQyQXvtWP1uPBEHDsM14LWZULMO3hwYUYjfHL2JQoqU";
  return `Opening browser to sign in…\r\nIf the browser didn't open, visit: \x1b]8;;${url}\x07${url}\x1b]8;;\x07\r\nPaste code here if prompted > `;
})();

export const CLAUDE_LOGIN_OSC8_URL =
  "https://claude.com/cai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference+user%3Asessions%3Aclaude_code+user%3Amcp_servers+user%3Afile_upload&code_challenge=G6Yj7zkAyTviPRBNtYPcXsUOCADu5WtcU1DGKq7woDo&code_challenge_method=S256&state=LQyQXvtWP1uPBEHDsM14LWZULMO3hwYUYjfHL2JQoqU";

export const CODEX_DEVICE_AUTH_ANSI = [
  "Follow these steps to sign in with ChatGPT using device code authorization:",
  "1. Open this link in your browser and sign in to your account",
  "   \x1b[94mhttps://auth.openai.com/codex/device\x1b[0m",
  "2. Enter this one-time code \x1b[90m(expires in 15 minutes)\x1b[0m",
  "   \x1b[94mUBN6-U35TZ\x1b[0m",
].join("\n");

export const CODEX_DEVICE_AUTH_OSC8_CR = [
  "Follow these steps to sign in with ChatGPT using device code authorization:",
  "1. Open this link in your browser and sign in to your account",
  "   \x1b]8;;https://auth.openai.com/codex/device\x07https://auth.openai.com/codex/device\x1b]8;;\x07",
  "2. Enter this one-time code (expires in 15 minutes)\r",
  "   UCSZ-GZ4P1\r",
].join("\n");

/** Unauthenticated `claude -p --output-format json` (exit 1). subtype is success. */
export const CLAUDE_PRINT_UNAUTHENTICATED = JSON.stringify({
  is_error: true,
  subtype: "success",
  terminal_reason: "api_error",
  result: "Not logged in · Please run /login",
  total_cost_usd: 0,
});

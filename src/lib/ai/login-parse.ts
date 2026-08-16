/** Strip CSI colors, OSC-8 hyperlinks, and other terminal sequences. */
export function stripAnsi(text: string): string {
  return text
    .replace(/\x1B\]8;[^;]*;[^\x07\x1b]*(?:\x07|\x1B\\)/g, "")
    .replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\x1B\][^\x07\x1b]*(?:\x07|\x1B\\)/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function trimUrl(url: string): string {
  return url.replace(/[.,;]+$/, "");
}

export function parseClaudeLoginOutput(
  text: string,
): { loginUrl: string } | null {
  const clean = stripAnsi(text);
  const match = clean.match(
    /https:\/\/(?:claude\.com|console\.anthropic\.com)\/cai\/oauth\/authorize\?[^\s"'<>]+/i,
  );
  if (match) return { loginUrl: trimUrl(match[0]) };
  const visit = clean.match(/visit:\s*(https:\/\/[^\s]+)/i);
  if (!visit) return null;
  return { loginUrl: trimUrl(visit[1]) };
}

export function parseCodexDeviceAuthOutput(
  text: string,
): { loginUrl: string; userCode: string } | null {
  const clean = stripAnsi(text);
  const urlMatch = clean.match(/https:\/\/auth\.openai\.com\/codex\/device/);
  const codeMatch = clean.match(
    /one-time code[^\n]*\n\s*([A-Z0-9]{3,}(?:-[A-Z0-9]{3,})+)/i,
  );
  if (!urlMatch || !codeMatch) return null;
  return { loginUrl: urlMatch[0], userCode: codeMatch[1] };
}

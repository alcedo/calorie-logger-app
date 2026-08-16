export function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*m/g, "");
}

export function parseClaudeLoginOutput(
  text: string,
): { loginUrl: string } | null {
  const clean = stripAnsi(text);
  const match = clean.match(/visit:\s*(https:\/\/[^\s]+)/i);
  if (!match) return null;
  return { loginUrl: match[1].replace(/[.,;]+$/, "") };
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

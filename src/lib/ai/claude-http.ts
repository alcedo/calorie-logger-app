import type { GenerateJsonRequest } from "./types";

export const CLAUDE_CODE_IDENTITY =
  "You are Claude Code, Anthropic's official CLI for Claude.";

export function claudeHttpModelId(model?: string): string {
  const id = (model ?? "").trim();
  if (!id || id === "sonnet") return "claude-sonnet-4-6";
  if (id === "haiku") return "claude-haiku-4-5-20251001";
  if (id === "opus") return "claude-opus-4-6";
  return id;
}

export function claudeHttpHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": token,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
    "user-agent": "claude-cli/2.1.260 (external, cli)",
    "x-app": "cli",
  };
}

export async function generateJsonViaClaudeHttp<T>(
  token: string,
  req: GenerateJsonRequest,
): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: claudeHttpHeaders(token),
    body: JSON.stringify({
      model: claudeHttpModelId(req.model),
      max_tokens: 4096,
      system: [
        { type: "text", text: CLAUDE_CODE_IDENTITY },
        { type: "text", text: req.system },
      ],
      messages: [{ role: "user", content: req.user }],
      tools: [
        {
          name: req.schemaName.slice(0, 64) || "result",
          description: "Return the structured result",
          input_schema: req.schema,
        },
      ],
      tool_choice: {
        type: "tool",
        name: req.schemaName.slice(0, 64) || "result",
      },
    }),
  });
  const payload = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    content?: Array<{ type?: string; input?: unknown; text?: string }>;
  } | null;
  if (!res.ok) {
    const message = payload?.error?.message || `Anthropic HTTP ${res.status}`;
    throw new Error(message);
  }
  const tool = payload?.content?.find((part) => part.type === "tool_use");
  if (tool?.input && typeof tool.input === "object") {
    return tool.input as T;
  }
  const text = payload?.content?.find((part) => part.type === "text")?.text;
  if (text) {
    try {
      return JSON.parse(text) as T;
    } catch {
      /* fall through */
    }
  }
  throw new Error("Claude HTTP returned no structured output");
}

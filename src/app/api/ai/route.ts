import { NextRequest, NextResponse } from "next/server";
import { clearAiStatusCache, getAiStatus } from "@/lib/ai";
import {
  cancelLogin,
  completeClaudeLogin,
  getLogin,
  logoutProvider,
  startClaudeLogin,
  startCodexLogin,
  type LoginKind,
} from "@/lib/ai/login";
import { validateClaudeSetupToken } from "@/lib/ai/setup-token";
import {
  deleteSetting,
  setSetting,
  SETTING_AI_PROVIDER,
  SETTING_CLAUDE_OAUTH_TOKEN,
} from "@/lib/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isKind(v: unknown): v is LoginKind {
  return v === "claude" || v === "codex";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = body?.action as string | undefined;

  try {
    switch (action) {
      case "connect": {
        if (!isKind(body?.provider)) {
          return NextResponse.json({ error: "provider must be claude or codex" }, { status: 400 });
        }
        const login =
          body.provider === "claude"
            ? await startClaudeLogin()
            : await startCodexLogin();
        return NextResponse.json({ login });
      }
      case "complete": {
        const sessionId = String(body?.sessionId ?? "");
        const code = String(body?.code ?? "");
        const login = await completeClaudeLogin(sessionId, code);
        clearAiStatusCache();
        const status = await getAiStatus();
        return NextResponse.json({ login, status });
      }
      case "poll": {
        const sessionId = String(body?.sessionId ?? "");
        const login = getLogin(sessionId);
        if (!login) {
          return NextResponse.json({ error: "No such login session" }, { status: 404 });
        }
        if (login.phase === "done") clearAiStatusCache();
        const status = login.phase === "done" ? await getAiStatus() : undefined;
        return NextResponse.json({ login, status });
      }
      case "cancel": {
        cancelLogin(String(body?.sessionId ?? ""));
        return NextResponse.json({ ok: true });
      }
      case "disconnect": {
        if (!isKind(body?.provider)) {
          return NextResponse.json({ error: "provider must be claude or codex" }, { status: 400 });
        }
        await logoutProvider(body.provider);
        if (body.provider === "claude") deleteSetting(SETTING_CLAUDE_OAUTH_TOKEN);
        clearAiStatusCache();
        return NextResponse.json({ status: await getAiStatus() });
      }
      case "token": {
        const parsed = validateClaudeSetupToken(String(body?.token ?? ""));
        if (!parsed.ok) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        setSetting(SETTING_CLAUDE_OAUTH_TOKEN, parsed.token);
        clearAiStatusCache();
        return NextResponse.json({ status: await getAiStatus() });
      }
      case "preference": {
        const selection = String(body?.selection ?? "").toLowerCase();
        if (!["auto", "claude", "codex", "none"].includes(selection)) {
          return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
        }
        setSetting(SETTING_AI_PROVIDER, selection);
        clearAiStatusCache();
        return NextResponse.json({ status: await getAiStatus() });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

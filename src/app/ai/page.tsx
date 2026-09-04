"use client";

import { useCallback, useEffect, useState } from "react";
import { AiPicker } from "@/components/AiPicker";
import type { AiLoginSessionDto, AiStatusDto, ProviderId } from "@/lib/ai/types";

type ProviderCard = "claude" | "codex";

async function postAi(body: Record<string, unknown>) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as {
    login?: AiLoginSessionDto;
    status?: AiStatusDto;
    error?: string;
  };
}

function providerState(status: AiStatusDto | null, id: ProviderCard) {
  return status?.providers.find((p) => p.id === id);
}

export default function AiPage() {
  const [status, setStatus] = useState<AiStatusDto | null>(null);
  const [login, setLogin] = useState<AiLoginSessionDto | null>(null);
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const refresh = useCallback(() => {
    return fetch("/api/status")
      .then((r) => r.json())
      .then((d: AiStatusDto) => {
        setStatus(d);
        const active = d.logins?.find(
          (l) => l.phase === "awaiting_user" || l.phase === "completing",
        );
        if (active) setLogin(active);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!login || login.provider !== "codex") return;
    if (login.phase !== "awaiting_user" && login.phase !== "completing") return;
    const t = setInterval(async () => {
      try {
        const data = await postAi({ action: "poll", sessionId: login.sessionId });
        if (data.login) setLogin(data.login);
        if (data.status) {
          setStatus(data.status);
          if (data.login?.phase === "done") setLogin(null);
        }
        if (data.login?.phase === "failed") {
          setError(data.login.error || "ChatGPT login failed");
        }
      } catch {
        /* session expired */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [login]);

  async function connect(provider: ProviderCard) {
    setError(null);
    setBusy(provider);
    try {
      const data = await postAi({ action: "connect", provider });
      setLogin(data.login ?? null);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function complete() {
    if (!login) return;
    setError(null);
    setBusy("complete");
    try {
      const data = await postAi({
        action: "complete",
        sessionId: login.sessionId,
        code,
      });
      if (data.status) setStatus(data.status);
      setLogin(null);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!login) return;
    await postAi({ action: "cancel", sessionId: login.sessionId }).catch(() => undefined);
    setLogin(null);
    setCode("");
  }

  async function disconnect(provider: ProviderCard) {
    setBusy("disconnect-" + provider);
    setError(null);
    try {
      const data = await postAi({ action: "disconnect", provider });
      if (data.status) setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveToken() {
    setBusy("token");
    setError(null);
    try {
      const data = await postAi({ action: "token", token });
      if (data.status) setStatus(data.status);
      setToken("");
      setShowToken(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function setPreference(patch: {
    selection?: string;
    models?: Partial<Record<ProviderId, string>>;
  }) {
    const data = await postAi({ action: "preference", ...patch });
    if (data.status) setStatus(data.status);
  }

  const claude = providerState(status, "claude");
  const codex = providerState(status, "codex");
  const serverless = Boolean(status?.serverlessHost);
  const claudeOn = Boolean(claude?.available);
  const codexOn = Boolean(codex?.available);
  const claudeCliMissing = !serverless && claude?.cliInstalled === false;
  const codexCliMissing = !serverless && codex?.cliInstalled === false;
  const claudeConnectBlocked = !status || claudeCliMissing;
  const codexConnectBlocked = !status || codexCliMissing;
  const anyCliMissing = claudeCliMissing || codexCliMissing;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header>
        <h1 className="text-lg font-semibold text-zinc-100">AI connections</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {serverless
            ? "Bring your Claude or ChatGPT subscription. Paste a Claude setup-token or connect ChatGPT. This host calls those APIs over HTTP because it cannot spawn the CLIs."
            : "Link the Claude or ChatGPT subscription you already pay for. No API keys. Unknown foods then look up automatically — the model searches USDA, Open Food Facts, and the web, and you can watch its thought process while logging."}
        </p>
        {serverless ? (
          <p className="mt-2 text-sm text-amber-300/90">
            On a computer with Claude Code, run <code>claude setup-token</code>{" "}
            and paste it below. ChatGPT uses the same device login as Codex.
            You can also set <code>CLAUDE_CODE_OAUTH_TOKEN</code> or{" "}
            <code>CODEX_AUTH_JSON</code> on the Vercel project so a cold start
            keeps the credential.
          </p>
        ) : anyCliMissing ? (
          <p className="mt-2 text-sm text-amber-300/90">
            Connect runs on this app&apos;s server, not on your phone. Install
            the CLI on that computer, then refresh this page.
          </p>
        ) : null}
      </header>

      {status?.bannerKind === "ok" && status.providerLabel && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Active: {status.providerLabel}
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Claude</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pro / Max / Team subscription via Claude Code
            </p>
            {!claudeOn && claude?.detail && (
              <p className="mt-2 text-xs text-amber-400/90">{claude.detail}</p>
            )}
          </div>
          <StatusPill
            ok={claudeOn}
            label={
              claudeOn
                ? claude?.subscriptionType
                  ? claude.subscriptionType
                  : "Connected"
                : claudeCliMissing
                  ? "CLI not installed"
                  : "Not connected"
            }
          />
        </div>

        {!serverless && login?.provider === "claude" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-300">
              1. Open the Claude login page and sign in with your subscription.
            </p>
            <a
              href={login.loginUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Open Claude login
            </a>
            <p className="text-sm text-zinc-300">
              2. After signing in, the page shows a code. Paste it here.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste code"
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={complete}
                disabled={busy === "complete" || !code.trim()}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100"
              >
                {busy === "complete" ? "Connecting…" : "Confirm code"}
              </button>
              <button
                onClick={cancel}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : !serverless ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => connect("claude")}
              disabled={busy === "claude" || claudeConnectBlocked}
              title={claudeCliMissing ? claude?.detail : undefined}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100"
            >
              {busy === "claude" ? "Starting…" : claudeOn ? "Reconnect Claude" : "Connect Claude"}
            </button>
            {claudeOn && (
              <button
                onClick={() => disconnect("claude")}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : claudeOn ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => disconnect("claude")}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300"
            >
              Disconnect
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowToken((v) => !v)}
          className="mt-3 text-xs text-zinc-500 underline"
        >
          {showToken ? "Hide setup-token" : "I already have a claude setup-token"}
        </button>
        {showToken && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-zinc-500">
              On a computer with Claude Code, run <code>claude setup-token</code> and
              paste the printed token. Lasts one year and does not refresh.
            </p>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="CLAUDE_CODE_OAUTH_TOKEN"
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
            <button
              onClick={saveToken}
              disabled={busy === "token" || !token.trim()}
              className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
            >
              Save token
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">ChatGPT · Codex</h2>
            <p className="mt-1 text-xs text-zinc-500">
              ChatGPT Plus / Pro subscription via Codex login — not an API key
            </p>
            {!codexOn && codex?.detail && (
              <p className="mt-2 text-xs text-amber-400/90">{codex.detail}</p>
            )}
          </div>
          <StatusPill
            ok={codexOn}
            label={
              codexOn
                ? "Connected"
                : codexCliMissing
                  ? "CLI not installed"
                  : "Not connected"
            }
          />
        </div>

        {login?.provider === "codex" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-300">
              1. Open ChatGPT device login and sign in.
            </p>
            <a
              href={login.loginUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950"
            >
              Open ChatGPT login
            </a>
            <p className="text-sm text-zinc-300">2. Enter this one-time code:</p>
            <p className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center font-mono text-2xl tracking-widest text-zinc-50">
              {login.userCode}
            </p>
            <p className="text-xs text-zinc-500">
              Waiting for you to finish in the browser… this page updates on its
              own.
            </p>
            <button
              onClick={cancel}
              className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => connect("codex")}
              disabled={busy === "codex" || (!serverless && codexConnectBlocked)}
              title={codexCliMissing ? codex?.detail : undefined}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:opacity-100"
            >
              {busy === "codex" ? "Starting…" : codexOn ? "Reconnect ChatGPT" : "Connect ChatGPT"}
            </button>
            {codexOn && (
              <button
                onClick={() => disconnect("codex")}
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300"
              >
                Disconnect
              </button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Provider and model</h2>
        <p className="mt-1 text-xs text-zinc-500">
          {serverless
            ? "Auto picks a pasted Claude token, then a ChatGPT login, then OPENAI_API_KEY."
            : "Choose which connected subscription (or paid OpenAI key) to use, and which model it should call. Auto picks Claude if it is signed in, otherwise ChatGPT."}
        </p>
        <div className="mt-4">
          <AiPicker status={status} onChange={setPreference} showAllModels />
        </div>
      </section>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${
        ok ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-500"
      }`}
    >
      {label ?? (ok ? "Connected" : "Not connected")}
    </span>
  );
}

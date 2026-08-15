"use client";

import { useState } from "react";
import { MicIcon, useSpeechInput } from "./SpeechInput";

export function LogComposer({
  onSubmit,
  busy,
}: {
  onSubmit: (text: string) => Promise<void>;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const { supported, listening, error, toggle } = useSpeechInput((transcript) =>
    setText(transcript)
  );

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    await onSubmit(value);
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 focus-within:border-emerald-500">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={
            listening
              ? "Listening… speak your meal"
              : 'What did you eat? e.g. "2 eggs and a bowl of oatmeal"'
          }
          className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-500"
        />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            title={listening ? "Stop listening" : "Log by voice"}
            aria-label={listening ? "Stop listening" : "Log by voice"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
              listening
                ? "recording bg-rose-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <MicIcon className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={busy || !text.trim()}
          className="flex h-10 items-center justify-center rounded-full bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Logging…" : "Log"}
        </button>
      </div>
    </div>
  );
}

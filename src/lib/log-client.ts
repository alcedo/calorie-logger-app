import type { EntryDto } from "@/lib/types";
import {
  consumeSse,
  type LogTraceEvent,
  type LogTraceListener,
} from "@/lib/log-trace";

export interface LogMealClientResult {
  logged: EntryDto[];
  unresolved: { name: string; reason: string }[];
  usedAiParser?: boolean;
  error?: string;
  trace: LogTraceEvent[];
}

export async function logMealFromClient(
  text: string,
  date: string,
  onEvent: LogTraceListener,
): Promise<LogMealClientResult> {
  const res = await fetch("/api/log?stream=1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ text, date }),
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const data = (await res.json().catch(() => ({}))) as LogMealClientResult & {
      error?: string;
    };
    const trace = Array.isArray(data.trace) ? data.trace : [];
    for (const event of trace) onEvent(event);
    if (!res.ok) {
      return {
        logged: data.logged ?? [],
        unresolved: data.unresolved ?? [],
        error: data.error ?? "Something went wrong.",
        trace,
      };
    }
    return {
      logged: data.logged ?? [],
      unresolved: data.unresolved ?? [],
      usedAiParser: data.usedAiParser,
      trace,
    };
  }

  if (!res.body) {
    return {
      logged: [],
      unresolved: [],
      error: "No response body",
      trace: [],
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const trace: LogTraceEvent[] = [];
  let done: Extract<LogTraceEvent, { type: "done" }> | null = null;
  let error: string | undefined;

  while (true) {
    const { done: eof, value } = await reader.read();
    if (eof) break;
    buffer += decoder.decode(value, { stream: true });
    const consumed = consumeSse(buffer);
    buffer = consumed.rest;
    for (const event of consumed.events) {
      trace.push(event);
      onEvent(event);
      if (event.type === "done") done = event;
      if (event.type === "error") error = event.message;
    }
  }
  if (buffer.trim()) {
    const consumed = consumeSse(buffer + "\n\n");
    for (const event of consumed.events) {
      trace.push(event);
      onEvent(event);
      if (event.type === "done") done = event;
      if (event.type === "error") error = event.message;
    }
  }

  return {
    logged: done?.logged ?? [],
    unresolved: done?.unresolved ?? [],
    usedAiParser: done?.usedAiParser,
    error,
    trace,
  };
}

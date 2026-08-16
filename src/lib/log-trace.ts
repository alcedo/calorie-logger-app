import type { EntryDto } from "./types";

export interface LogSearchHitDto {
  title: string;
  url: string;
  snippet: string;
  source: "usda" | "openfoodfacts" | "web";
}

export type LogTraceEvent =
  | { type: "step"; id: string; title: string; detail?: string }
  | { type: "thought"; text: string }
  | { type: "search"; query: string }
  | { type: "search_result"; query: string; hit: LogSearchHitDto }
  | {
      type: "done";
      logged: EntryDto[];
      unresolved: { name: string; reason: string }[];
      usedAiParser: boolean;
    }
  | { type: "error"; message: string };

export type LogTraceListener = (event: LogTraceEvent) => void;

export function encodeSse(event: LogTraceEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Split an SSE buffer into complete events; returns leftover partial data. */
export function consumeSse(
  buffer: string,
): { events: LogTraceEvent[]; rest: string } {
  const events: LogTraceEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    const line = part
      .split("\n")
      .map((l) => l.trimEnd())
      .find((l) => l.startsWith("data:"));
    if (!line) continue;
    const payload = line.replace(/^data:\s?/, "").trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      events.push(JSON.parse(payload) as LogTraceEvent);
    } catch {
      // skip malformed chunks
    }
  }
  return { events, rest };
}

export function wantsStream(acceptHeader: string | null, streamParam: string | null): boolean {
  if (streamParam === "1" || streamParam === "true") return true;
  return (acceptHeader ?? "").includes("text/event-stream");
}

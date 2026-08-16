import { describe, expect, it } from "vitest";
import { consumeSse, encodeSse, wantsStream } from "./log-trace";

describe("SSE helpers", () => {
  it("round-trips a thought event", () => {
    const encoded = encodeSse({ type: "thought", text: "split into eggs" });
    const { events, rest } = consumeSse(encoded);
    expect(rest).toBe("");
    expect(events).toEqual([{ type: "thought", text: "split into eggs" }]);
  });

  it("keeps a partial trailing chunk", () => {
    const { events, rest } = consumeSse('data: {"type":"step"');
    expect(events).toEqual([]);
    expect(rest).toContain("step");
  });

  it("detects stream requests", () => {
    expect(wantsStream("text/event-stream", null)).toBe(true);
    expect(wantsStream("application/json", "1")).toBe(true);
    expect(wantsStream("application/json", null)).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { todayLocalDate } from "./types";

describe("todayLocalDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns YYYY-MM-DD in the local timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15, 10, 0, 0)); // Aug 15 local
    expect(todayLocalDate()).toBe("2026-08-15");
  });

  it("uses local calendar date near midnight (not UTC shift)", () => {
    vi.useFakeTimers();
    // Local Aug 15 01:00 — still Aug 15 locally regardless of UTC offset
    vi.setSystemTime(new Date(2026, 7, 15, 1, 0, 0));
    const local = todayLocalDate();
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(local).toBe("2026-08-15");
  });
});

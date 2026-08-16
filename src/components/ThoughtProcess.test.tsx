/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThoughtProcess } from "./ThoughtProcess";
import type { LogTraceEvent } from "@/lib/log-trace";

describe("ThoughtProcess", () => {
  afterEach(() => cleanup());

  it("renders parse steps, reasoning, and web search hits", () => {
    const events: LogTraceEvent[] = [
      { type: "step", id: "parse", title: "Reading your meal", detail: "Claude" },
      { type: "thought", text: "Two eggs and a banana." },
      { type: "search", query: "banana nutrition facts" },
      {
        type: "search_result",
        query: "banana nutrition facts",
        hit: {
          title: "Bananas, raw",
          url: "https://fdc.nal.usda.gov/food-details/1/nutrients",
          snippet: "89 kcal per 100 g",
          source: "usda",
        },
      },
    ];
    render(<ThoughtProcess events={events} busy={false} />);
    expect(screen.getByText("Thought process")).toBeInTheDocument();
    expect(screen.getByText("Reading your meal")).toBeInTheDocument();
    expect(screen.getByText(/Two eggs and a banana/)).toBeInTheDocument();
    expect(screen.getByText(/banana nutrition facts/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Bananas, raw/i });
    expect(link).toHaveAttribute(
      "href",
      "https://fdc.nal.usda.gov/food-details/1/nutrients",
    );
    expect(screen.getByText("USDA")).toBeInTheDocument();
  });

  it("shows a working indicator while busy", () => {
    render(<ThoughtProcess events={[]} busy={true} />);
    expect(screen.getByText("Working…")).toBeInTheDocument();
  });
});

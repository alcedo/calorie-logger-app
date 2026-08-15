/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryList } from "./EntryList";
import type { EntryDto } from "@/lib/types";

const sample: EntryDto = {
  id: 1,
  date: "2026-08-15",
  loggedAt: "2026-08-15T12:00:00.000Z",
  foodId: 1,
  foodName: "Egg",
  quantity: 2,
  unit: "serving",
  calories: 144,
  protein: 12.6,
  carbs: 0.8,
  fat: 9.6,
  fiber: 0,
  sugar: 0,
  sodium: 142,
  rawInput: "2 eggs",
};

describe("EntryList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows empty state", () => {
    render(<EntryList entries={[]} onChanged={vi.fn()} />);
    expect(screen.getByText(/Nothing logged yet/i)).toBeInTheDocument();
  });

  it("deletes an entry and calls onChanged", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<EntryList entries={[sample]} onChanged={onChanged} />);

    await user.click(screen.getByLabelText("Delete Egg"));
    expect(fetch).toHaveBeenCalledWith("/api/entries/1", { method: "DELETE" });
    expect(onChanged).toHaveBeenCalled();
  });

  it("skips PATCH for invalid quantity", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<EntryList entries={[sample]} onChanged={onChanged} />);

    await user.click(screen.getByTitle("Edit quantity"));
    const input = screen.getByDisplayValue("2");
    await user.clear(input);
    await user.type(input, "0");
    await user.click(screen.getByText("Save"));

    expect(fetch).not.toHaveBeenCalledWith(
      "/api/entries/1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(onChanged).toHaveBeenCalled();
  });

  it("PATCHes when quantity is valid", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<EntryList entries={[sample]} onChanged={onChanged} />);

    await user.click(screen.getByTitle("Edit quantity"));
    const input = screen.getByDisplayValue("2");
    await user.clear(input);
    await user.type(input, "3");
    await user.click(screen.getByText("Save"));

    expect(fetch).toHaveBeenCalledWith(
      "/api/entries/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ quantity: 3 }),
      })
    );
    expect(onChanged).toHaveBeenCalled();
  });
});

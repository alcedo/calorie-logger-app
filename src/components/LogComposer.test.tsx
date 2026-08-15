/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LogComposer } from "./LogComposer";

vi.mock("./SpeechInput", () => ({
  useSpeechInput: () => ({
    supported: false,
    listening: false,
    error: null,
    toggle: vi.fn(),
  }),
  MicIcon: () => null,
}));

describe("LogComposer", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables Log when empty or busy", () => {
    const { rerender } = render(
      <LogComposer onSubmit={vi.fn()} busy={false} />
    );
    expect(screen.getByRole("button", { name: "Log" })).toBeDisabled();

    rerender(<LogComposer onSubmit={vi.fn()} busy={true} />);
    expect(screen.getByRole("button", { name: "Logging…" })).toBeDisabled();
  });

  it("submits on Enter and clears the textarea", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LogComposer onSubmit={onSubmit} busy={false} />);

    const textarea = screen.getByPlaceholderText(/What did you eat/i);
    await user.type(textarea, "2 eggs");
    await user.keyboard("{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("2 eggs");
    expect(textarea).toHaveValue("");
  });

  it("does not submit on Shift+Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LogComposer onSubmit={onSubmit} busy={false} />);

    const textarea = screen.getByPlaceholderText(/What did you eat/i);
    await user.type(textarea, "2 eggs");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("2 eggs\n");
  });
});

/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Nav } from "./Nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("Nav", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders brand and primary links", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    render(<Nav />);
    expect(screen.getByText("Macro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Today/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByRole("link", { name: /History/i })).toHaveAttribute(
      "href",
      "/history"
    );
    expect(screen.getByRole("link", { name: /Foods/i })).toHaveAttribute(
      "href",
      "/foods"
    );
    expect(screen.getByRole("link", { name: /^AI$/i })).toHaveAttribute(
      "href",
      "/ai"
    );
  });

  it("shows the signed-in name and sign out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { name: "Ada Lovelace", email: "ada@example.com" },
        }),
      }),
    );
    render(<Nav />);
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
  });
});

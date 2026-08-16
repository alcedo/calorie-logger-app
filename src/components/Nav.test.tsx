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
  afterEach(() => cleanup());

  it("renders brand and primary links", () => {
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
    expect(
      screen.getByRole("link", { name: /Foods & Goals/i })
    ).toHaveAttribute("href", "/foods");
  });
});

/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MacroDashboard } from "./MacroDashboard";

describe("MacroDashboard", () => {
  afterEach(() => cleanup());

  const goals = { calories: 2000, protein: 120, carbs: 225, fat: 65 };

  it("renders calorie total and macro bars", () => {
    render(
      <MacroDashboard
        totals={{
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 20,
          fiber: 8,
          sugar: 12,
          sodium: 300,
        }}
        goals={goals}
      />
    );
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText(/\/ 2000 kcal/)).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.getByText(/Fiber 8g/)).toBeInTheDocument();
    expect(screen.getByText(/Sugar 12g/)).toBeInTheDocument();
    expect(screen.getByText(/Sodium 300mg/)).toBeInTheDocument();
  });

  it("uses over-goal styling when calories exceed goal", () => {
    const { container } = render(
      <MacroDashboard
        totals={{
          calories: 2500,
          protein: 40,
          carbs: 50,
          fat: 20,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        }}
        goals={goals}
      />
    );
    expect(container.querySelector(".text-rose-500")).toBeTruthy();
  });

  it("caps visual progress at 100% when over macro goals", () => {
    const { container } = render(
      <MacroDashboard
        totals={{
          calories: 100,
          protein: 999,
          carbs: 50,
          fat: 20,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        }}
        goals={goals}
      />
    );
    const bars = container.querySelectorAll(".h-full.rounded-full");
    const proteinBar = Array.from(bars).find((el) =>
      el.className.includes("bg-sky-400")
    );
    expect(proteinBar).toHaveStyle({ width: "100%" });
  });
});

import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("Today: AI-off banner and log meal updates dashboard", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText(/AI is not configured/i)
  ).toBeVisible({ timeout: 20_000 });

  const textarea = page.getByPlaceholder(/What did you eat/i);
  await textarea.fill("2 eggs and 200g chicken breast");
  await page.getByRole("button", { name: "Log", exact: true }).click();

  await expect(page.getByText("Egg").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("Chicken Breast").first()).toBeVisible();
  // dashboard shows summed calories (144 + 330 = 474)
  await expect(page.getByText("474").first()).toBeVisible();
  await expect(page.getByText("Thought process")).toBeVisible();
  await expect(page.getByText(/built-in parser/i).first()).toBeVisible();
  await expect(page.getByLabel("AI provider")).toBeVisible();
});

test("AI page: provider and model pickers", async ({ page }) => {
  await page.goto("/ai");
  await expect(page.getByRole("heading", { name: "AI connections" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("heading", { name: /Provider and model/i })).toBeVisible();
  await expect(page.getByLabel("AI provider")).toBeVisible();
  await expect(page.getByLabel("claude model")).toBeVisible();
  await expect(page.getByLabel("codex model")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Claude" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Connect ChatGPT" })).toBeDisabled();
  await expect(page.getByText("CLI not installed").first()).toBeVisible();
  await expect(
    page.getByText(/Install the CLI on that computer/i),
  ).toBeVisible();
});

test("History: expand day loads entries", async ({ page }) => {
  await page.goto("/history");

  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  // After prior log, at least one day summary should exist
  const dayButton = page.locator("ul li button").first();
  await expect(dayButton).toBeVisible({ timeout: 20_000 });
  await dayButton.click();

  await expect(page.getByText("Egg").first()).toBeVisible({ timeout: 15_000 });
});

test("Foods: search and edit a food", async ({ page }) => {
  await page.goto("/foods");

  await expect(page.getByText("Food database")).toBeVisible({ timeout: 20_000 });
  const search = page.getByPlaceholder("Search foods…");
  await search.fill("Egg");
  await expect(page.getByText("Egg").first()).toBeVisible({ timeout: 10_000 });

  // First matching row's Edit button
  await page.getByRole("button", { name: "Edit" }).first().click();
  const calories = page.getByRole("spinbutton", { name: "Calories", exact: true });
  await calories.fill("80");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByText(/80\s+kcal/).first()).toBeVisible({ timeout: 10_000 });
});

import { test, expect } from "@playwright/test";

test.describe("Features Page", () => {
  test("renders the features page with hero heading", async ({ page }) => {
    await page.goto("/features");
    await expect(page.locator("h1")).toContainText("Everything you need");
  });

  test("displays the core feature cards", async ({ page }) => {
    await page.goto("/features");
    // Cards are below the fold — scroll down
    await page.evaluate(() => window.scrollBy(0, 600));
    await expect(page.locator("text=AI-Powered Prose")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Branching Choices")).toBeVisible();
    await expect(page.locator("text=Genre & Tone")).toBeVisible();
  });

  test("displays the how-it-works section", async ({ page }) => {
    await page.goto("/features");
    await page.evaluate(() => window.scrollBy(0, 1200));
    await expect(page.locator("text=Describe your idea")).toBeVisible({ timeout: 10_000 });
  });

  test("has a get started CTA", async ({ page }) => {
    await page.goto("/features");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole("button", { name: /get started/i })).toBeVisible({ timeout: 10_000 });
  });

  test("CTA redirects unauthenticated user to auth", async ({ page }) => {
    await page.goto("/features");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("button", { name: /get started/i }).click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("has navbar and footer", async ({ page }) => {
    await page.goto("/features");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });
});

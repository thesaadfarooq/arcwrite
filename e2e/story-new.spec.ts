import { test, expect } from "@playwright/test";

test.describe("Story New Page (unauthenticated)", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/story/new");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("Story New Page - Landing integration", () => {
  test("start writing button on landing page links to story creation", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Start writing")).toBeVisible();
  });

  test("clicking start writing redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Start writing");
    await expect(page).toHaveURL(/\/auth/);
  });
});

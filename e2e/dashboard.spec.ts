import { test, expect } from "@playwright/test";

test.describe("Dashboard Page (unauthenticated)", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("Dashboard - Landing Page Integration", () => {
  test("unauthenticated users see sign-in on landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("pricing page is accessible and shows tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Choose your plan")).toBeVisible();
    await expect(page.locator("text=Free").first()).toBeVisible();
  });
});

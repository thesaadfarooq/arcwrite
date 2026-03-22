import { test, expect } from "../playwright-fixture";

test.describe("Dashboard Page (unauthenticated)", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("Dashboard - Landing Page Integration", () => {
  test("landing page links to dashboard for authenticated users concept", async ({ page }) => {
    // Unauthenticated users should see sign-in instead of dashboard link
    await page.goto("/");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("pricing page has back button that navigates away", async ({ page }) => {
    await page.goto("/pricing");
    await page.click("text=Back");
    // Should navigate to landing for unauthenticated
    await expect(page).toHaveURL("/");
  });
});

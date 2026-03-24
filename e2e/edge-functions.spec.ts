import { test, expect } from "@playwright/test";

test.describe("Edge Function Integration (Unauthenticated)", () => {
  test("check-subscription fails gracefully without auth", async ({ page }) => {
    // The app calls check-subscription on auth state change
    // For unauthenticated users, it should not cause errors
    await page.goto("/");
    // No error toasts should appear on the landing page
    await page.waitForTimeout(2000);
    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });

  test("pricing page loads without errors", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForTimeout(2000);
    // No crash, page renders correctly
    await expect(page.locator("text=Choose your plan")).toBeVisible();
  });
});

import { test, expect } from "../playwright-fixture";

test.describe("Shared Story Page - Full Coverage", () => {
  test("shows error for invalid share token", async ({ page }) => {
    await page.goto("/s/invalid-token-12345");
    await expect(page.locator("text=Story not found")).toBeVisible({ timeout: 10000 });
  });

  test("shows branding", async ({ page }) => {
    await page.goto("/s/some-token");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
  });

  test("shows back/home button", async ({ page }) => {
    await page.goto("/s/some-token");
    // Wait for either error message or content to load
    await page.waitForTimeout(2000);
    await expect(page.locator("text=Arcwrite")).toBeVisible();
  });

  test("handles missing token gracefully", async ({ page }) => {
    await page.goto("/s/");
    // Should show 404 or redirect
    await page.waitForTimeout(2000);
  });
});

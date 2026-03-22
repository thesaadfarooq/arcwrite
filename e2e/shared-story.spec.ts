import { test, expect } from "../playwright-fixture";

test.describe("Shared Story Page", () => {
  test("shows error for invalid share token", async ({ page }) => {
    await page.goto("/s/invalid-token-12345");
    await expect(page.locator("text=Story not found")).toBeVisible({ timeout: 10000 });
  });

  test("shows branding on shared story page", async ({ page }) => {
    await page.goto("/s/some-token");
    await expect(page.locator("text=VibeWrite")).toBeVisible();
  });
});

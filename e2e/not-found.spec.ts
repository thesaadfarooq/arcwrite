import { test, expect } from "../playwright-fixture";

test.describe("404 Page", () => {
  test("shows 404 for unknown routes", async ({ page }) => {
    await page.goto("/some-random-page-that-doesnt-exist");
    await expect(page.locator("text=404")).toBeVisible();
  });
});

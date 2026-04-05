import { test, expect } from "@playwright/test";

test.describe("About Page", () => {
  test("renders the about page with heading and content", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toContainText("About Arcwrite");
    await expect(page.locator("text=AI-powered interactive fiction")).toBeVisible();
  });

  test("has navbar and footer", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("mentions Silvergrain in footer", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("footer")).toContainText("Silvergrain");
  });
});

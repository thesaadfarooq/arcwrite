import { test, expect } from "@playwright/test";

test.describe("Footer Navigation", () => {
  test("footer has page links that navigate correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();

    // Footer should contain links to Features, Pricing, About, Contact
    const footer = page.locator("footer");
    await expect(footer.locator('a[href="/features"]')).toBeVisible();
    await expect(footer.locator('a[href="/pricing"]')).toBeVisible();
    await expect(footer.locator('a[href="/about"]')).toBeVisible();
    await expect(footer.locator('a[href="/contact"]')).toBeVisible();
  });

  test("footer has genre links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.locator('a[href="/genres/fantasy"]')).toBeVisible();
    await expect(footer.locator('a[href="/genres/scifi"]')).toBeVisible();
    await expect(footer.locator('a[href="/genres/mystery"]')).toBeVisible();
    await expect(footer.locator('a[href="/genres/romance"]')).toBeVisible();
    await expect(footer.locator('a[href="/genres/horror"]')).toBeVisible();
    await expect(footer.locator('a[href="/genres/thriller"]')).toBeVisible();
  });

  test("clicking a footer page link navigates", async ({ page }) => {
    await page.goto("/");
    await page.locator('footer a[href="/features"]').click();
    await expect(page).toHaveURL(/\/features/);
    await expect(page.locator("h1")).toContainText("Everything you need");
  });

  test("clicking a footer genre link navigates", async ({ page }) => {
    await page.goto("/");
    await page.locator('footer a[href="/genres/fantasy"]').click();
    await expect(page).toHaveURL(/\/genres\/fantasy/);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("footer shows copyright with Silvergrain", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toContainText("Silvergrain");
    await expect(page.locator("footer")).toContainText("All rights reserved");
  });
});

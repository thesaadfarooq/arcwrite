import { test, expect } from "../playwright-fixture";

test.describe("Responsive Design", () => {
  test("landing page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("pricing page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/pricing");
    await expect(page.locator("text=Choose your plan")).toBeVisible();
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=Plus")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
  });

  test("auth page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/auth");
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("landing page renders on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
  });

  test("pricing page renders on wide desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pricing");
    await expect(page.locator("text=Choose your plan")).toBeVisible();
  });
});

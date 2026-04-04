import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test("renders all three pricing tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Choose your plan")).toBeVisible();
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=Plus").first()).toBeVisible();
    await expect(page.locator("text=Pro").first()).toBeVisible();
  });

  test("displays correct prices", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=$9.99")).toBeVisible();
    await expect(page.locator("text=$15.99")).toBeVisible();
  });

  test("displays tier features", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Stories").first()).toBeVisible();
    await expect(page.locator("text=Turns per story").first()).toBeVisible();
    await expect(page.locator("text=AI quality").first()).toBeVisible();
  });

  test("shows Popular badge on Plus tier", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Popular")).toBeVisible();
  });

  test("upgrade buttons redirect to auth when not logged in", async ({ page }) => {
    await page.goto("/pricing");
    const upgradeButtons = page.locator("button", { hasText: /Upgrade|Get started/i });
    await upgradeButtons.first().click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("branding is visible", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Arcwrite").first()).toBeVisible();
  });

  test("tier descriptions are shown", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Try AI-assisted interactive fiction")).toBeVisible();
    await expect(page.locator("text=More stories, better AI, full control")).toBeVisible();
    await expect(page.locator("text=Unlimited creation and sharing")).toBeVisible();
  });
});

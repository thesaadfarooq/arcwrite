import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test("renders all three pricing tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Choose your plan")).toBeVisible();
    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Plus")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
  });

  test("displays correct prices", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=$9.99")).toBeVisible();
    await expect(page.locator("text=$19.99")).toBeVisible();
  });

  test("displays tier features", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=2 stories")).toBeVisible();
    await expect(page.locator("text=15 stories")).toBeVisible();
    await expect(page.locator("text=Unlimited stories")).toBeVisible();
  });

  test("shows Popular badge on Plus tier", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Popular")).toBeVisible();
  });

  test("upgrade buttons redirect to auth when not logged in", async ({ page }) => {
    await page.goto("/pricing");
    // Click the first "Upgrade" button
    const upgradeButtons = page.locator("button", { hasText: "Upgrade" });
    await upgradeButtons.first().click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("back button navigates away", async ({ page }) => {
    await page.goto("/pricing");
    await page.click("text=Back");
    await expect(page).not.toHaveURL(/\/pricing/);
  });

  test("branding is visible", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
  });
});

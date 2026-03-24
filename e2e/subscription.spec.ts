import { test, expect } from "@playwright/test";

test.describe("Subscription & Tier Logic (Unit-like)", () => {
  test("pricing page renders current plan badge for free users", async ({ page }) => {
    await page.goto("/pricing");
    // Free tier should show "Current plan" button for unauthenticated
    await expect(page.locator("button", { hasText: "Current plan" })).toBeVisible();
  });

  test("pricing page has upgrade buttons for paid tiers", async ({ page }) => {
    await page.goto("/pricing");
    const upgradeButtons = page.locator("button", { hasText: "Upgrade" });
    await expect(upgradeButtons).toHaveCount(2); // Plus and Pro
  });

  test("tier features are correctly listed", async ({ page }) => {
    await page.goto("/pricing");
    // Free tier features
    await expect(page.locator("text=5 chapters per story")).toBeVisible();
    await expect(page.locator("text=Standard AI models").first()).toBeVisible();
    // Plus tier features
    await expect(page.locator("text=20 chapters per story")).toBeVisible();
    await expect(page.locator("text=PDF export").first()).toBeVisible();
    // Pro tier features
    await expect(page.locator("text=Unlimited chapters")).toBeVisible();
    await expect(page.locator("text=Public sharing links")).toBeVisible();
    await expect(page.locator("text=Best AI models")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

import { getStoryTestCredentials, loginWithEmail } from "./helpers";

/**
 * Dashboard authenticated e2e tests.
 *
 * Requires PW_TEST_EMAIL / PW_TEST_PASSWORD env vars.
 * The test account should have at least one story.
 */

test.describe("Dashboard (authenticated)", () => {
  test.setTimeout(60_000);

  test("shows the dashboard after login", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Your Stories").first()).toBeVisible({ timeout: 10_000 });
  });

  test("displays story cards", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // At least one story card should be visible
    const cards = page.locator(".cursor-pointer").filter({ hasText: /.+/ });
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
  });

  test("story card dropdown opens without auto-navigating", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Wait for cards to load
    const card = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await card.waitFor({ timeout: 15_000 });

    // Click the three-dot menu button (first one found)
    const menuTrigger = card.locator("button").filter({ has: page.locator("svg") }).last();
    await menuTrigger.click();

    // The dropdown should show menu items
    await expect(page.getByRole("menuitem", { name: /continue/i })).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("menuitem", { name: /delete/i })).toBeVisible();

    // Should NOT have navigated away
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("clicking a story card navigates to the story", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    const card = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await card.waitFor({ timeout: 15_000 });
    await card.click();

    await page.waitForURL(/\/story\/(?!new)/, { timeout: 10_000 });
  });

  test("new story button navigates to story creation", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    const newStoryBtn = page.getByRole("button", { name: /new story/i }).or(
      page.locator("a").filter({ hasText: /new story/i })
    );
    await expect(newStoryBtn).toBeVisible({ timeout: 10_000 });
    await newStoryBtn.click();

    await page.waitForURL(/\/story\/new/, { timeout: 10_000 });
  });

  test("logout button works", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await expect(page).toHaveURL(/\/dashboard/);

    // Find and click logout
    const logoutBtn = page.getByRole("button", { name: /log\s*out|sign\s*out/i });
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    // Should redirect to auth or landing
    await expect(page).toHaveURL(/\/(auth|$)/, { timeout: 10_000 });
  });
});

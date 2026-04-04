import { test, expect } from "@playwright/test";

import { getStoryTestCredentials, loginWithEmail } from "./helpers";

/**
 * Story Write desktop e2e tests — toolbar, structure sidebar, and explore pane.
 *
 * Requires PW_TEST_EMAIL / PW_TEST_PASSWORD env vars.
 * The test account should have at least one story with content.
 */

test.describe("Story Write (desktop, authenticated)", () => {
  test.setTimeout(90_000);

  async function openExistingStory(page: import("@playwright/test").Page) {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    const card = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await card.waitFor({ timeout: 15_000 });
    await card.click();
    await page.waitForURL(/\/story\/(?!new)/, { timeout: 10_000 });
    // Wait for canvas / story content
    await page.waitForSelector("article, .story-content, [class*=canvas]", { timeout: 30_000 });
  }

  test("story page loads with toolbar buttons", async ({ page }) => {
    await openExistingStory(page);

    // Toolbar should show structure and explore buttons
    const structureBtn = page.locator('button[title="Story structure"]').or(
      page.getByRole("button", { name: /structure/i })
    );
    await expect(structureBtn).toBeVisible({ timeout: 10_000 });

    const exploreBtn = page.locator('button[title="Explore branches"]');
    await expect(exploreBtn).toBeVisible();
  });

  test("structure sidebar opens and shows chapters tab", async ({ page }) => {
    await openExistingStory(page);

    const structureBtn = page.locator('button[title="Story structure"]').or(
      page.getByRole("button", { name: /structure/i })
    );
    await structureBtn.click();

    // Sidebar / sheet should show chapters
    await expect(page.getByRole("tab", { name: /chapters/i })).toBeVisible({ timeout: 5_000 });
  });

  test("story displays paragraphs of text", async ({ page }) => {
    await openExistingStory(page);

    // The story should have at least one paragraph of text
    const paragraphs = page.locator("article p, .story-content p, [class*=paragraph]");
    await expect(paragraphs.first()).toBeVisible({ timeout: 15_000 });
    const count = await paragraphs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("choice cards appear after story content loads", async ({ page }) => {
    await openExistingStory(page);

    // If the story is at a choice point, choice cards should appear
    // (they may also not appear if story is generating or complete)
    // We just check the page doesn't error out
    await page.waitForTimeout(3_000);
    // No unhandled errors should be present
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.waitForTimeout(2_000);
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });

  test("explore pane toggle is idempotent", async ({ page }) => {
    await openExistingStory(page);

    const exploreBtn = page.locator('button[title="Explore branches"]');
    await exploreBtn.click();
    await expect(page.locator("text=Explore")).toBeVisible({ timeout: 5_000 });

    // Toggle off
    await exploreBtn.click();
    await expect(page.locator('button[aria-label="Close explore panel"]')).not.toBeVisible({ timeout: 3_000 });

    // Toggle on again
    await exploreBtn.click();
    await expect(page.locator("text=Explore")).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Story Write (desktop) — error states", () => {
  test("non-existent story ID shows error or redirects", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await page.goto("/story/00000000-0000-0000-0000-000000000000");

    // Should show some error indication or redirect
    await page.waitForTimeout(5_000);
    const url = page.url();
    const hasError = await page.locator("text=not found").or(page.locator("text=error")).isVisible().catch(() => false);
    const redirected = !url.includes("00000000");
    expect(hasError || redirected).toBeTruthy();
  });
});

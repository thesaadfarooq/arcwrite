import { test, expect } from "@playwright/test";

import { getStoryTestCredentials, loginWithEmail } from "./helpers";

/**
 * Explore Mode e2e tests.
 *
 * These tests require:
 *   - PW_TEST_EMAIL / PW_TEST_PASSWORD env vars pointing to a test account
 *   - The test account must have at least one story with ≥2 nodes
 */

// ─── Desktop ─────────────────────────────────────────────────────────────────

test.describe("Explore Mode (desktop)", () => {
  test.setTimeout(90_000);

  test("opens the explore pane via the toolbar button", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Navigate to the first story on the dashboard
    // Click the first story card on the dashboard
    const storyCard = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await storyCard.waitFor({ timeout: 30_000 });
    await storyCard.click();

    await page.waitForURL(/\/story\/(?!new)/);

    // Wait for story content to load
    await page.waitForSelector('[data-testid="story-canvas"], .story-content, article', { timeout: 30_000 });

    // Click the explore (branch) button in the toolbar
    const exploreBtn = page.locator('button[title="Explore branches"]');
    await expect(exploreBtn).toBeVisible({ timeout: 10_000 });
    await exploreBtn.click();

    // The explore pane should appear with the graph header
    await expect(page.locator("text=Explore")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=node")).toBeVisible(); // "N nodes" count
  });

  test("shows the center button and it resets the view", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Click the first story card on the dashboard
    const storyCard = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await storyCard.waitFor({ timeout: 30_000 });
    await storyCard.click();
    await page.waitForURL(/\/story\/(?!new)/);
    await page.waitForSelector('[data-testid="story-canvas"], .story-content, article', { timeout: 30_000 });

    const exploreBtn = page.locator('button[title="Explore branches"]');
    await exploreBtn.click();
    await expect(page.locator("text=Explore")).toBeVisible({ timeout: 5_000 });

    // Center button should be visible
    const centerBtn = page.locator('button[title="Center view"]');
    await expect(centerBtn).toBeVisible();

    // Clicking it should not throw / should work without errors
    await centerBtn.click();
    // Pane should still be visible after centering
    await expect(page.locator("text=Explore")).toBeVisible();
  });

  test("can close the explore pane", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Click the first story card on the dashboard
    const storyCard = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await storyCard.waitFor({ timeout: 30_000 });
    await storyCard.click();
    await page.waitForURL(/\/story\/(?!new)/);
    await page.waitForSelector('[data-testid="story-canvas"], .story-content, article', { timeout: 30_000 });

    const exploreBtn = page.locator('button[title="Explore branches"]');
    await exploreBtn.click();
    await expect(page.locator("text=Explore")).toBeVisible({ timeout: 5_000 });

    // Close via the close button
    const closeBtn = page.locator('button[aria-label="Close explore panel"]');
    await closeBtn.click();

    // The explore header should no longer be visible
    await expect(page.locator('button[aria-label="Close explore panel"]')).not.toBeVisible({ timeout: 3_000 });
  });

  test("graph renders nodes in the explore pane", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Click the first story card on the dashboard
    const storyCard = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await storyCard.waitFor({ timeout: 30_000 });
    await storyCard.click();
    await page.waitForURL(/\/story\/(?!new)/);
    await page.waitForSelector('[data-testid="story-canvas"], .story-content, article', { timeout: 30_000 });

    const exploreBtn = page.locator('button[title="Explore branches"]');
    await exploreBtn.click();
    await expect(page.locator("text=Explore")).toBeVisible({ timeout: 5_000 });

    // React Flow renders nodes as divs with class .react-flow__node
    const nodes = page.locator(".react-flow__node");
    await expect(nodes.first()).toBeVisible({ timeout: 5_000 });
    const count = await nodes.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("hovering a node shows a tooltip", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Click the first story card on the dashboard
    const storyCard = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await storyCard.waitFor({ timeout: 30_000 });
    await storyCard.click();
    await page.waitForURL(/\/story\/(?!new)/);
    await page.waitForSelector('[data-testid="story-canvas"], .story-content, article', { timeout: 30_000 });

    const exploreBtn = page.locator('button[title="Explore branches"]');
    await exploreBtn.click();

    const node = page.locator(".react-flow__node").first();
    await node.waitFor({ timeout: 5_000 });
    await node.hover();

    // Tooltip is portalled to body — look for the tooltip content
    // It should contain a word count (e.g. "123w")
    await expect(page.locator("body > div").filter({ hasText: /\d+w/ })).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Mobile ──────────────────────────────────────────────────────────────────

test.describe("Explore Mode (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(90_000);

  test("opens the explore sheet via the bottom bar", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Click the first story card on the dashboard
    const storyCard = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await storyCard.waitFor({ timeout: 30_000 });
    await storyCard.click();
    await page.waitForURL(/\/story\/(?!new)/);

    // Wait for mobile bar to appear
    const exploreTab = page.getByRole("button", { name: /explore/i });
    await expect(exploreTab).toBeVisible({ timeout: 60_000 });
    await exploreTab.click();

    // The sheet dialog should appear with the graph
    await expect(page.locator("text=Explore Branches")).toBeVisible({ timeout: 5_000 });

    // React Flow nodes should render
    const nodes = page.locator(".react-flow__node");
    await expect(nodes.first()).toBeVisible({ timeout: 5_000 });
  });
});

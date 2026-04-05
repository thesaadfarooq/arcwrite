import { test, expect } from "@playwright/test";

import { getStoryTestCredentials, loginWithEmail } from "./helpers";

/**
 * Story writing page interaction tests — section length, custom direction,
 * chapter break, and tone display.
 *
 * Requires PW_TEST_EMAIL / PW_TEST_PASSWORD env vars.
 * The test account should have at least one story with content + choice cards visible.
 */

test.describe("Story Write Interactions (desktop)", () => {
  test.setTimeout(90_000);

  async function openExistingStory(page: import("@playwright/test").Page) {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    const card = page.locator(".cursor-pointer").filter({ hasText: /.+/ }).first();
    await card.waitFor({ timeout: 15_000 });
    await card.click();
    await page.waitForURL(/\/story\/(?!new)/, { timeout: 10_000 });
    await page.waitForSelector("article, .story-content, [class*=canvas]", { timeout: 30_000 });
  }

  test("section length selector is visible and has options", async ({ page }) => {
    await openExistingStory(page);

    // Look for the section length selector — it shows the current length like "Medium"
    const lengthSelector = page.locator("text=Brief").or(
      page.locator("text=Short").or(
        page.locator("text=Medium").or(
          page.locator("text=Long").or(page.locator("text=Epic"))
        )
      )
    );
    // At least one length option should be visible somewhere on the page
    await expect(lengthSelector.first()).toBeVisible({ timeout: 15_000 });
  });

  test("custom direction flow shows textarea and go button", async ({ page }) => {
    await openExistingStory(page);

    // Wait for choice cards
    const writeOwnBtn = page.getByRole("button", { name: /write your own/i });
    // Only test if choice cards are in view (story might be complete)
    const hasWriteOwn = await writeOwnBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasWriteOwn) {
      test.skip();
      return;
    }

    await writeOwnBtn.click();

    // Should show a textarea or input for custom direction
    await expect(
      page.locator("textarea").or(page.locator('input[placeholder*="direction"]'))
    ).toBeVisible({ timeout: 5_000 });

    // Go button should be present (disabled if empty)
    await expect(page.getByRole("button", { name: /go/i })).toBeVisible();
  });

  test("chapter break button opens the chapter break dialog", async ({ page }) => {
    await openExistingStory(page);

    const chapterBtn = page.getByRole("button", { name: /chapter break/i });
    const hasChapterBtn = await chapterBtn.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasChapterBtn) {
      test.skip();
      return;
    }

    await chapterBtn.click();

    // Should show the chapter break dialog/sheet
    await expect(
      page.locator("text=Choose where the new chapter should begin").or(
        page.locator("text=chapter").filter({ hasText: /begin|break|new/i })
      )
    ).toBeVisible({ timeout: 5_000 });
  });

  test("story canvas shows paragraph text", async ({ page }) => {
    await openExistingStory(page);

    // Story should have visible paragraph text
    const paragraphs = page.locator("article p, [class*=paragraph] p, [class*=canvas] p");
    await expect(paragraphs.first()).toBeVisible({ timeout: 15_000 });
    const textContent = await paragraphs.first().textContent();
    expect(textContent!.length).toBeGreaterThan(10);
  });

  test("story page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await openExistingStory(page);
    await page.waitForTimeout(3_000);

    // Filter out ResizeObserver (known benign issue) and extension errors
    const realErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("extension"),
    );
    expect(realErrors).toHaveLength(0);
  });
});

import { test, expect } from "@playwright/test";

import { getStoryTestCredentials, loginWithEmail } from "./helpers";

/**
 * Full story creation flow on desktop.
 *
 * Requires PW_TEST_EMAIL / PW_TEST_PASSWORD env vars.
 */

test.describe("Story Creation Flow (desktop, authenticated)", () => {
  test.setTimeout(120_000);

  test("premise → tone → begin writing → AI generates opening → choices appear", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    // Navigate to new story
    await page.goto("/story/new");

    // Step 1: Premise
    await expect(page.getByRole("heading", { name: /what's your story about/i })).toBeVisible();
    const premiseText = "A lighthouse keeper discovers a hidden door in the basement that leads to a world where the ocean is above and the sky is below.";
    await page.locator("textarea").fill(premiseText);

    // "Choose tone" should be enabled now
    const chooseToneBtn = page.getByRole("button", { name: /choose tone/i });
    await expect(chooseToneBtn).toBeEnabled();
    await chooseToneBtn.click();

    // Step 2: Tone
    await expect(page.getByRole("heading", { name: /set the tone/i })).toBeVisible();

    // Select a tone
    await page.getByRole("button", { name: /dark & gritty/i }).click();

    // Story length options should be visible
    await expect(page.locator("text=Story length")).toBeVisible();
    await expect(page.locator("text=Short")).toBeVisible();
    await expect(page.locator("text=Medium")).toBeVisible();
    await expect(page.locator("text=Long")).toBeVisible();

    // Begin writing
    const beginBtn = page.getByRole("button", { name: /begin writing/i });
    await expect(beginBtn).toBeEnabled();
    await beginBtn.click();

    // Should navigate to a story page
    await page.waitForURL(
      (url) => url.pathname.startsWith("/story/") && url.pathname !== "/story/new",
      { timeout: 30_000 },
    );

    // Wait for AI to generate the opening — story content should appear
    const storyContent = page.locator("article p, .story-content p, [class*=paragraph]");
    await expect(storyContent.first()).toBeVisible({ timeout: 60_000 });

    // Choice cards should appear after the opening is generated
    const choiceArea = page.locator("text=Discovery").or(
      page.locator("text=Bond").or(
        page.locator("text=Omen").or(
          page.locator("text=Risk").or(
            page.locator("text=Crafting your options")
          )
        )
      )
    );
    await expect(choiceArea.first()).toBeVisible({ timeout: 60_000 });
  });

  test("genre mode → select genre → see starters → choose tone → begin", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await page.goto("/story/new?mode=genre");

    // Step 1: Genre selection
    await expect(page.getByRole("heading", { name: /pick a genre/i })).toBeVisible();
    await expect(page.locator("text=Fantasy")).toBeVisible();
    await expect(page.locator("text=Sci-Fi")).toBeVisible();
    await expect(page.locator("text=Mystery")).toBeVisible();
    await expect(page.locator("text=Romance")).toBeVisible();
    await expect(page.locator("text=Horror")).toBeVisible();
    await expect(page.locator("text=Thriller")).toBeVisible();

    // Select Fantasy
    await page.locator("button").filter({ hasText: "Fantasy" }).first().click();

    // Starter prompts should appear for Fantasy
    await expect(page.locator("text=Starter prompts for Fantasy")).toBeVisible();

    // Move to tone
    await page.getByRole("button", { name: /choose tone/i }).click();
    await expect(page.getByRole("heading", { name: /set the tone/i })).toBeVisible();

    // Select whimsical tone
    await page.getByRole("button", { name: /whimsical/i }).click();

    // Begin writing
    await page.getByRole("button", { name: /begin writing/i }).click();
    await page.waitForURL(
      (url) => url.pathname.startsWith("/story/") && url.pathname !== "/story/new",
      { timeout: 30_000 },
    );
  });

  test("starter prompt fills the premise textarea", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await page.goto("/story/new");
    await expect(page.getByRole("heading", { name: /what's your story about/i })).toBeVisible();

    // Click a "Try this starter" button
    await page.getByRole("button", { name: /try this starter/i }).first().click();

    // Textarea should now have content
    const textareaValue = await page.locator("textarea").inputValue();
    expect(textareaValue.length).toBeGreaterThan(10);
  });

  test("cannot proceed with empty premise", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await page.goto("/story/new");
    await expect(page.getByRole("heading", { name: /what's your story about/i })).toBeVisible();

    // Choose tone button should be disabled with empty premise
    const chooseToneBtn = page.getByRole("button", { name: /choose tone/i });
    await expect(chooseToneBtn).toBeDisabled();
  });

  test("back button on tone step returns to premise step", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await page.goto("/story/new");
    await page.locator("textarea").fill("A test story about testing things in a testing world.");
    await page.getByRole("button", { name: /choose tone/i }).click();
    await expect(page.getByRole("heading", { name: /set the tone/i })).toBeVisible();

    // Click back
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByRole("heading", { name: /what's your story about/i })).toBeVisible();
  });

  test("custom tone input works", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();
    await loginWithEmail(page, email, password);

    await page.goto("/story/new");
    await page.locator("textarea").fill("A test story about a magical library that rearranges itself.");
    await page.getByRole("button", { name: /choose tone/i }).click();

    // Type a custom tone
    await page.locator('input[placeholder="Custom tone..."]').fill("Melancholic yet hopeful");

    // Begin writing should be enabled
    const beginBtn = page.getByRole("button", { name: /begin writing/i });
    await expect(beginBtn).toBeEnabled();
  });
});

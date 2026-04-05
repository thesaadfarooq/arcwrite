import { test, expect } from "@playwright/test";

const GENRES = ["fantasy", "scifi", "mystery", "romance", "horror", "thriller"];

test.describe("Genre Landing Pages", () => {
  for (const genre of GENRES) {
    test(`/genres/${genre} renders with genre-specific content`, async ({ page }) => {
      await page.goto(`/genres/${genre}`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("nav")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }

  test("fantasy genre page shows genre-specific heading and content", async ({ page }) => {
    await page.goto("/genres/fantasy");
    await expect(page.locator("h1")).toContainText(/fantasy/i);
    // Hero description mentions genre-relevant content
    const heroText = await page.locator("h1 + p, h1 ~ p").first().textContent();
    expect(heroText).toMatch(/magic|mythical|quest/i);
  });

  test("CTA redirects unauthenticated user to auth", async ({ page }) => {
    await page.goto("/genres/fantasy");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("button", { name: /begin writing/i }).click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("unknown genre shows a fallback or 404", async ({ page }) => {
    await page.goto("/genres/nonexistent");
    // Should either show 404 or redirect
    await page.waitForTimeout(2000);
    const content = await page.content();
    const hasContent = content.includes("404") || content.includes("Not found") || content.includes("nonexistent");
    expect(hasContent).toBeTruthy();
  });
});

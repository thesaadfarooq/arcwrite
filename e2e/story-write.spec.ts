import { test, expect } from "@playwright/test";

test.describe("Story Write Page (unauthenticated)", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/story/some-story-id");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("redirects for any story ID format", async ({ page }) => {
    await page.goto("/story/7c89e8e4-84e3-4f11-a417-6b2eb139d7b6");
    await expect(page).toHaveURL(/\/auth/);
  });
});

import { expect, test } from "@playwright/test";

import { getStoryTestCredentials, loginWithEmail } from "./helpers";

test.describe("Story Write Page (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens the mobile structure sheet without the desktop sidebar", async ({ page }) => {
    test.setTimeout(90_000);

    const { email, password } = getStoryTestCredentials();

    await loginWithEmail(page, email, password);
    await page.goto("/story/new");

    await expect(page.getByRole("heading", { name: /what's your story about/i })).toBeVisible();
    await page.locator("textarea").fill("A radio operator follows a signal into the marsh.");
    await page.getByRole("button", { name: /choose tone/i }).click();

    await expect(page.getByRole("heading", { name: /set the tone/i })).toBeVisible();
    await page.getByRole("button", { name: /dark & gritty/i }).click();
    await page.getByRole("button", { name: /begin writing/i }).click();

    await page.waitForURL((url) => url.pathname.startsWith("/story/") && url.pathname !== "/story/new");
    await expect(page.getByRole("button", { name: /structure/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("aside")).toHaveCount(0, { timeout: 60_000 });

    await page.getByRole("button", { name: /structure/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("tab", { name: /chapters/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /timeline/i })).toBeVisible();
  });
});

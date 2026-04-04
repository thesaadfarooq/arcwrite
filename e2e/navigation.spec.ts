import { test, expect } from "@playwright/test";

test.describe("Navigation & Routing", () => {
  test("unauthenticated user cannot access dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("unauthenticated user cannot access story/new", async ({ page }) => {
    await page.goto("/story/new");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("unauthenticated user cannot access story/:id", async ({ page }) => {
    await page.goto("/story/some-id");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("pricing page is accessible without auth", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.locator("text=Choose your plan")).toBeVisible();
  });

  test("landing page is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Arcwrite").first()).toBeVisible();
  });

  test("reset-password page is accessible", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/reset-password/);
  });
});

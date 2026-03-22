import { test, expect } from "../playwright-fixture";

test.describe("Reset Password Page", () => {
  test("renders reset password form", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator("text=VibeWrite")).toBeVisible();
    await expect(page.locator("text=Set your new password")).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator("text=Update password")).toBeVisible();
  });

  test("password input has minimum length requirement", async ({ page }) => {
    await page.goto("/reset-password");
    const input = page.locator('input[type="password"]');
    await expect(input).toHaveAttribute("required", "");
    await expect(input).toHaveAttribute("minLength", "6");
  });

  test("submit button exists and is enabled", async ({ page }) => {
    await page.goto("/reset-password");
    const button = page.locator('button[type="submit"]');
    await expect(button).toBeEnabled();
  });
});

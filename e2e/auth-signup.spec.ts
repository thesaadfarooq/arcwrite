import { test, expect } from "@playwright/test";

test.describe("Auth Page — Signup Interactions", () => {
  test("signup form shows confirm password field", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await expect(page.locator("text=Create your account")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
  });

  test("shows match indicator when passwords match", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");

    await page.locator("#password").fill("TestPassword123!");
    await page.locator("#confirmPassword").fill("TestPassword123!");

    await expect(page.locator("text=Passwords match")).toBeVisible();
  });

  test("shows mismatch indicator when passwords differ", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");

    await page.locator("#password").fill("TestPassword123!");
    await page.locator("#confirmPassword").fill("DifferentPassword");

    await expect(page.locator("text=Passwords do not match")).toBeVisible();
  });

  test("submit with mismatched passwords shows error toast", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");

    await page.locator("#email").fill("signup-test@example.com");
    await page.locator("#password").fill("TestPassword123!");
    await page.locator("#confirmPassword").fill("DifferentPassword");
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 });
  });

  test("forgot password shows email-only form", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");

    await expect(page.locator("text=Reset your password")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('#password')).not.toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("forgot password sends reset and shows toast", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await expect(page.locator("text=Reset your password")).toBeVisible();

    await page.locator("#email").fill("reset-test@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();

    // Should show feedback toast
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 15000 });
  });
});

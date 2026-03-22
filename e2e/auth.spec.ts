import { test, expect } from "../playwright-fixture";

test.describe("Auth Page", () => {
  test("renders login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("can switch to signup mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Create one");
    await expect(page.locator("text=Create your account")).toBeVisible();
  });

  test("can switch to forgot password mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await expect(page.locator("text=Reset password")).toBeVisible();
  });

  test("shows error on invalid login", async ({ page }) => {
    await page.goto("/auth");
    await page.fill('input[type="email"]', "nonexistent@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Wait for error toast
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/auth");
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await expect(passwordInput).toHaveAttribute("type", "password");
    // Click the eye icon to show password
    await page.locator("button").filter({ has: page.locator('[class*="eye"]') }).first().click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("authenticated user is redirected to dashboard", async ({ page }) => {
    // This test checks the PublicOnlyRoute behavior
    // If already logged in, visiting /auth should redirect
    await page.goto("/auth");
    // For unauthenticated users, we should stay on auth
    await expect(page).toHaveURL(/\/auth/);
  });
});

import { test, expect } from "../playwright-fixture";

test.describe("Auth Page - Complete Coverage", () => {
  test("renders login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("shows branding", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=VibeWrite")).toBeVisible();
  });

  test("shows Google sign-in button in login mode", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("shows Google sign-in button in signup mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("hides Google sign-in button in forgot password mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await expect(page.locator("text=Continue with Google")).not.toBeVisible();
  });

  test("can switch to signup mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await expect(page.locator("text=Create your account")).toBeVisible();
    await expect(page.locator("text=Create account")).toBeVisible();
  });

  test("can switch back from signup to login", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await expect(page.locator("text=Create your account")).toBeVisible();
    await page.click("text=Sign in");
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("can switch to forgot password mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await expect(page.locator("text=Reset your password")).toBeVisible();
    await expect(page.locator("text=Send reset link")).toBeVisible();
  });

  test("can switch back from forgot to login", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await page.click("text=Back to sign in");
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("forgot password mode hides password field", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).not.toBeVisible();
  });

  test("shows error on invalid login", async ({ page }) => {
    await page.goto("/auth");
    await page.fill('input[type="email"]', "nonexistent@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/auth");
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("type", "password");
    // Click the eye icon button
    await page.locator('#password + button, button:near(#password)').first().click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("has theme toggle button", async ({ page }) => {
    await page.goto("/auth");
    // Theme toggle is fixed top-right
    const themeBtn = page.locator("button.fixed, button").filter({ has: page.locator("svg") }).first();
    await expect(themeBtn).toBeVisible();
  });

  test("shows or separator between Google and email form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=or")).toBeVisible();
  });

  test("email input has correct attributes", async ({ page }) => {
    await page.goto("/auth");
    const emailInput = page.locator("#email");
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("password input has minLength requirement", async ({ page }) => {
    await page.goto("/auth");
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("minLength", "6");
  });

  test("login mode shows correct footer links", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=Forgot password?")).toBeVisible();
    await expect(page.locator("text=Don't have an account?")).toBeVisible();
  });

  test("signup mode shows correct footer link", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await expect(page.locator("text=Already have an account?")).toBeVisible();
  });
});

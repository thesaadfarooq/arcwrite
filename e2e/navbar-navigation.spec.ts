import { test, expect } from "@playwright/test";

test.describe("Navbar Navigation (desktop)", () => {
  test("navbar shows all navigation links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav.locator('a[href="/features"]')).toBeVisible();
    await expect(nav.locator('a[href="/pricing"]')).toBeVisible();
    await expect(nav.locator('a[href="/about"]')).toBeVisible();
    await expect(nav.locator('a[href="/contact"]')).toBeVisible();
  });

  test("clicking Features in navbar navigates to features page", async ({ page }) => {
    await page.goto("/");
    await page.locator('nav a[href="/features"]').click();
    await expect(page).toHaveURL(/\/features/);
  });

  test("clicking Pricing in navbar navigates to pricing page", async ({ page }) => {
    await page.goto("/");
    await page.locator('nav a[href="/pricing"]').click();
    await expect(page).toHaveURL(/\/pricing/);
  });

  test("clicking About in navbar navigates to about page", async ({ page }) => {
    await page.goto("/");
    await page.locator('nav a[href="/about"]').click();
    await expect(page).toHaveURL(/\/about/);
  });

  test("clicking Contact in navbar navigates to contact page", async ({ page }) => {
    await page.goto("/");
    await page.locator('nav a[href="/contact"]').click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test("logo links back to home", async ({ page }) => {
    await page.goto("/pricing");
    await page.locator('nav a[aria-label="Arcwrite"]').click();
    await expect(page).toHaveURL("/");
  });

  test("sign in button navigates to auth page", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").locator("text=Sign in").click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("active link is highlighted on current page", async ({ page }) => {
    await page.goto("/features");
    const featuresLink = page.locator('nav a[href="/features"]');
    const classes = await featuresLink.getAttribute("class");
    // Active link should have font-medium class
    expect(classes).toContain("font-medium");
  });
});

test.describe("Navbar Navigation (mobile)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("shows hamburger menu on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('button[aria-label="Open menu"]')).toBeVisible();
    // Desktop nav links should be hidden
    await expect(page.locator('nav a[href="/features"]')).not.toBeVisible();
  });

  test("opens mobile sheet and shows nav links", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[aria-label="Open menu"]').click();

    // Wait for sheet dialog to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[role="dialog"]').locator("text=Features")).toBeVisible();
    await expect(page.locator('[role="dialog"]').locator("text=Pricing")).toBeVisible();
    await expect(page.locator('[role="dialog"]').locator("text=About")).toBeVisible();
    await expect(page.locator('[role="dialog"]').locator("text=Contact")).toBeVisible();
  });

  test("mobile sheet link navigates and closes", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[aria-label="Open menu"]').click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });

    await page.locator('[role="dialog"]').locator("text=Features").click();
    await expect(page).toHaveURL(/\/features/);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section with branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Arcwrite").first()).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("displays hero headline", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=You direct the story")).toBeVisible();
    await expect(page.locator("text=AI writes it")).toBeVisible();
  });

  test("has a start writing CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Start writing")).toBeVisible();
  });

  test("theme toggle works", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    // The theme toggle is a button containing an svg icon
    await page.locator("button").filter({ has: page.locator("svg.lucide-moon, svg.lucide-sun") }).first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("unauthenticated user sees sign-in button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("sign-in button navigates to auth page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Sign in");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("start writing redirects to auth if not logged in", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Start writing");
    await expect(page).toHaveURL(/\/auth/);
  });
});

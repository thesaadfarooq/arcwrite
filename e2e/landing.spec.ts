import { test, expect } from "../playwright-fixture";

test.describe("Landing Page", () => {
  test("renders hero section with branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("displays story creation mode cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Start from scratch")).toBeVisible();
    await expect(page.locator("text=Pick a genre")).toBeVisible();
    await expect(page.locator("text=Surprise me")).toBeVisible();
  });

  test("theme toggle switches between light and dark", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("unauthenticated user sees sign-in button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("clicking sign-in navigates to auth page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Sign in");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("clicking a story mode card redirects to auth if not logged in", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Start from scratch");
    await expect(page).toHaveURL(/\/auth/);
  });
});

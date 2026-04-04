import { test, expect } from "@playwright/test";

test.describe("Theme Toggle", () => {
  test("landing page has a theme toggle", async ({ page }) => {
    await page.goto("/");
    const themeBtn = page.locator('button[aria-label="Toggle theme"]').first();
    await expect(themeBtn).toBeVisible();
  });

  test("theme toggle changes HTML class on landing page", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.locator('button[aria-label="Toggle theme"]').first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("auth page has a theme toggle", async ({ page }) => {
    await page.goto("/auth");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.locator('button[aria-label="Toggle theme"]').first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("pricing page has a theme toggle", async ({ page }) => {
    await page.goto("/pricing");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.locator('button[aria-label="Toggle theme"]').first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });
});

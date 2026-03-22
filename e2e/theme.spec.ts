import { test, expect } from "../playwright-fixture";

test.describe("Theme Toggle", () => {
  test("landing page has a theme toggle", async ({ page }) => {
    await page.goto("/");
    // There should be a theme toggle button with a sun or moon icon
    const buttons = page.locator("button").filter({ has: page.locator("svg") });
    await expect(buttons.first()).toBeVisible();
  });

  test("theme toggle changes HTML class on landing page", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    // Click the first button with an SVG (theme toggle)
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("auth page has a theme toggle", async ({ page }) => {
    await page.goto("/auth");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    // Toggle theme
    await page.locator("button.fixed").first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("pricing page has a theme toggle", async ({ page }) => {
    await page.goto("/pricing");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });
});

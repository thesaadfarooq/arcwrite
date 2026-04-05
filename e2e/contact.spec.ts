import { test, expect } from "@playwright/test";

test.describe("Contact Page", () => {
  test("renders the contact form with all fields", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("h1")).toContainText("Contact us");
    await expect(page.locator("#contact-name")).toBeVisible();
    await expect(page.locator("#contact-email")).toBeVisible();
    await expect(page.locator("#contact-message")).toBeVisible();
    await expect(page.getByRole("button", { name: /send message/i })).toBeVisible();
  });

  test("shows the support email address", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator('a[href="mailto:support@arcwrite.app"]')).toBeVisible();
  });

  test("form fields have required validation", async ({ page }) => {
    await page.goto("/contact");
    const nameInput = page.locator("#contact-name");
    const emailInput = page.locator("#contact-email");
    const messageInput = page.locator("#contact-message");

    await expect(nameInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(messageInput).toHaveAttribute("required", "");
  });

  test("email field enforces email type", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("#contact-email")).toHaveAttribute("type", "email");
  });

  test("submits the form successfully", async ({ page }) => {
    await page.goto("/contact");
    await page.fill("#contact-name", "E2E Test User");
    await page.fill("#contact-email", "e2etest@arcwrite.app");
    await page.fill("#contact-message", "This is an automated E2E test message — please ignore.");
    await page.getByRole("button", { name: /send message/i }).click();

    // Should show success toast
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-sonner-toast]')).toContainText(/sent/i);

    // Form should be cleared after success
    await expect(page.locator("#contact-name")).toHaveValue("");
    await expect(page.locator("#contact-email")).toHaveValue("");
    await expect(page.locator("#contact-message")).toHaveValue("");
  });

  test("has navbar and footer", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });
});

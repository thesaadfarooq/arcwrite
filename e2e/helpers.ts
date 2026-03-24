import { type Page } from "@playwright/test";

export async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto("/auth");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

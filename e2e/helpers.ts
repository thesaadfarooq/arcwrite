import { type Page } from "@playwright/test";

export function getStoryTestCredentials() {
  const email = process.env.PW_TEST_EMAIL;
  const password = process.env.PW_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("PW_TEST_EMAIL and PW_TEST_PASSWORD must be set for authenticated story e2e tests");
  }

  return { email, password };
}

export async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto("/auth");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}

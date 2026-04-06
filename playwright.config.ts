import { readFileSync } from "fs";
import { defineConfig, devices } from "@playwright/test";

// Load .env so PW_TEST_* vars are available to tests
try {
  const env = readFileSync(".env", "utf-8");
  for (const line of env.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch { /* .env not present */ }

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npx vercel dev --listen 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});

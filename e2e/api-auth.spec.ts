import { test, expect } from "@playwright/test";

test.describe("API Authentication Enforcement", () => {
  const AI_ENDPOINTS = [
    { path: "/api/generate-section", body: { tone: "dark", length: "short", direction: "test" } },
    { path: "/api/generate-choices", body: { recentText: "test" } },
    { path: "/api/summarize", body: { fullText: "test" } },
  ];

  for (const { path, body } of AI_ENDPOINTS) {
    test(`${path} returns 401 without auth`, async ({ request }) => {
      const response = await request.post(path, {
        data: body,
        headers: { "Content-Type": "application/json" },
      });
      expect(response.status()).toBe(401);
      const json = await response.json();
      expect(json.error).toContain("Authentication required");
    });

    test(`${path} returns 401 with invalid token`, async ({ request }) => {
      const response = await request.post(path, {
        data: body,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer invalid-token-12345",
        },
      });
      expect(response.status()).toBe(401);
    });
  }

  test("/api/export-story returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/export-story", {
      data: { storyId: "fake-id" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(500);
    const json = await response.json();
    expect(json.error).toContain("Not authenticated");
  });

  test("/api/create-checkout returns error without auth", async ({ request }) => {
    const response = await request.post("/api/create-checkout", {
      data: { priceId: "fake-price" },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(500);
    const json = await response.json();
    expect(json.error).toContain("No authorization header");
  });
});

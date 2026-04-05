import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const getUserTierMock = vi.fn();

vi.mock("../../api/_lib/auth.js", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getUserTier: getUserTierMock,
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
}));

vi.mock("../../src/lib/tone-profiles.js", () => ({
  getToneDirective: (tone?: string) => (tone ? `TONE: ${tone}` : null),
}));

describe("rewrite-paragraph route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", { method: "OPTIONS" });
    const resp = await handler(req);
    expect(resp.status).toBe(204);
  });

  it("returns 401 when not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(401);
  });

  it("returns 400 when paragraphText or instruction missing", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ paragraphText: "text" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(400);
  });

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ paragraphText: "text", instruction: "make it better" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(500);
  });

  it("returns 429 when OpenAI rate limits", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("free");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Rate limited"),
    }));
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ paragraphText: "text", instruction: "rewrite" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(429);
    vi.unstubAllGlobals();
  });

  it("returns 500 when OpenAI returns a non-429 error", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("free");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server error"),
    }));
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ paragraphText: "text", instruction: "rewrite" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(500);
    vi.unstubAllGlobals();
  });

  it("streams the response body on success", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("pro");
    const fakeBody = new ReadableStream({ start(c) { c.close(); } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: fakeBody }));
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const req = new Request("http://localhost/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({
        paragraphText: "The old man sat.",
        instruction: "Make it more vivid",
        tone: "dark",
        genre: "horror",
        premise: "A haunted house",
        surroundingContext: { before: "Before text", after: "After text" },
      }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toBe("text/event-stream");
    vi.unstubAllGlobals();
  });
});

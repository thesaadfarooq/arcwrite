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

describe("summarize route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/summarize")).default;
    const req = new Request("http://localhost/api/summarize", { method: "OPTIONS" });
    const resp = await handler(req);
    expect(resp.status).toBe(204);
  });

  it("returns 401 when not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/summarize")).default;
    const req = new Request("http://localhost/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullText: "test" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(401);
  });

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("free");
    const handler = (await import("../../api/summarize")).default;
    const req = new Request("http://localhost/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ fullText: "Once upon a time" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body.error).toContain("OPENAI_API_KEY");
  });

  it("returns 500 when OpenAI returns an error", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("free");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad request"),
    }));
    const handler = (await import("../../api/summarize")).default;
    const req = new Request("http://localhost/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ fullText: "Once upon a time" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(500);
    vi.unstubAllGlobals();
  });

  it("streams tool call chunks and returns assembled JSON", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("plus");

    const chunks = [
      'data: {"choices":[{"delta":{"tool_calls":[{"function":{"arguments":"{\\"summary\\""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"function":{"arguments":": \\"A short story\\", \\"story_state\\": {}}"}}]}}]}\n\n',
      "data: [DONE]\n\n",
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
        controller.close();
      },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: stream }));
    const handler = (await import("../../api/summarize")).default;
    const req = new Request("http://localhost/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
      body: JSON.stringify({ fullText: "Once upon a time", previousSummary: "prev", storyState: {} }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.summary).toBe("A short story");
    vi.unstubAllGlobals();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const getAuthenticatedUserMock = vi.fn();
const getUserTierMock = vi.fn();

vi.mock("../../api/_lib/auth.js", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("../../api/_lib/tier.js", () => ({
  getUserTier: getUserTierMock,
}));

vi.mock("../../src/lib/tone-profiles.js", () => ({
  getToneDirective: (tone?: string) => (tone ? `TONE: ${tone}` : null),
}));

function createReq(overrides: Partial<VercelRequest> = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer tok", "content-type": "application/json" },
    body: {},
    ...overrides,
  } as unknown as VercelRequest;
}

function createRes() {
  return {
    statusCode: 200,
    _headers: {} as Record<string, string>,
    _body: undefined as unknown,
    _chunks: [] as unknown[],
    _ended: false,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this._body = payload; return this; },
    end() { this._ended = true; return this; },
    setHeader(k: string, v: string) { this._headers[k] = v; },
    write(chunk: unknown) { this._chunks.push(chunk); },
  } as unknown as VercelResponse & {
    statusCode: number;
    _headers: Record<string, string>;
    _body: unknown;
    _chunks: unknown[];
    _ended: boolean;
  };
}

describe("rewrite-paragraph route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const res = createRes();
    await handler(createReq({ method: "OPTIONS" }), res);
    expect(res.statusCode).toBe(204);
    expect(res._ended).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const res = createRes();
    await handler(createReq({ headers: {} }), res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 400 when paragraphText or instruction missing", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const res = createRes();
    await handler(createReq({ body: { paragraphText: "text" } }), res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const res = createRes();
    await handler(
      createReq({ body: { paragraphText: "text", instruction: "make it better" } }),
      res
    );
    expect(res.statusCode).toBe(500);
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
    const res = createRes();
    await handler(
      createReq({ body: { paragraphText: "text", instruction: "rewrite" } }),
      res
    );
    expect(res.statusCode).toBe(429);
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
    const res = createRes();
    await handler(
      createReq({ body: { paragraphText: "text", instruction: "rewrite" } }),
      res
    );
    expect(res.statusCode).toBe(500);
    vi.unstubAllGlobals();
  });

  it("streams the response body on success", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("pro");
    const encoder = new TextEncoder();
    const fakeBody = new ReadableStream({
      start(c) {
        c.enqueue(encoder.encode("data: test\n\n"));
        c.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body: fakeBody }));
    const handler = (await import("../../api/rewrite-paragraph")).default;
    const res = createRes();
    await handler(
      createReq({
        body: {
          paragraphText: "The old man sat.",
          instruction: "Make it more vivid",
          tone: "dark",
          genre: "horror",
          premise: "A haunted house",
          surroundingContext: { before: "Before text", after: "After text" },
        },
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res._headers["Content-Type"]).toBe("text/event-stream");
    expect(res._chunks.length).toBeGreaterThan(0);
    expect(res._ended).toBe(true);
    vi.unstubAllGlobals();
  });
});

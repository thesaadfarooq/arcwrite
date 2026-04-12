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
    _ended: false,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this._body = payload; return this; },
    end() { this._ended = true; return this; },
    setHeader(k: string, v: string) { this._headers[k] = v; },
    write() {},
  } as unknown as VercelResponse & {
    statusCode: number;
    _headers: Record<string, string>;
    _body: unknown;
    _ended: boolean;
  };
}

describe("summarize route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "sk-test";
  });

  it("returns 204 for OPTIONS", async () => {
    const handler = (await import("../../api/summarize")).default;
    const res = createRes();
    await handler(createReq({ method: "OPTIONS" }), res);
    expect(res.statusCode).toBe(204);
    expect(res._ended).toBe(true);
  });

  it("returns 401 when not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/summarize")).default;
    const res = createRes();
    await handler(createReq({ headers: {} }), res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 500 when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    getUserTierMock.mockResolvedValue("free");
    const handler = (await import("../../api/summarize")).default;
    const res = createRes();
    await handler(
      createReq({ body: { fullText: "Once upon a time" } }),
      res
    );
    expect(res.statusCode).toBe(500);
    expect(res._body).toEqual({ error: "OPENAI_API_KEY is not configured" });
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
    const res = createRes();
    await handler(
      createReq({ body: { fullText: "Once upon a time" } }),
      res
    );
    expect(res.statusCode).toBe(500);
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
    const res = createRes();
    await handler(
      createReq({ body: { fullText: "Once upon a time", previousSummary: "prev", storyState: {} } }),
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res._body).toEqual({ summary: "A short story", story_state: {} });
    vi.unstubAllGlobals();
  });
});

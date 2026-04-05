import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: getSessionMock },
  },
}));

describe("rewrite-api streamRewrite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls onError when not authenticated", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { streamRewrite } = await import("@/lib/rewrite-api");
    const onError = vi.fn();
    await streamRewrite({
      paragraphText: "text",
      instruction: "rewrite",
      surroundingContext: { before: "", after: "" },
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("Not authenticated");
  });

  it("calls onError when the API returns an error", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Something went wrong" }),
    }));
    const { streamRewrite } = await import("@/lib/rewrite-api");
    const onError = vi.fn();
    await streamRewrite({
      paragraphText: "text",
      instruction: "rewrite",
      surroundingContext: { before: "", after: "" },
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("Something went wrong");
    vi.unstubAllGlobals();
  });

  it("calls onError when response has no body", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    }));
    const { streamRewrite } = await import("@/lib/rewrite-api");
    const onError = vi.fn();
    await streamRewrite({
      paragraphText: "text",
      instruction: "rewrite",
      surroundingContext: { before: "", after: "" },
      onDelta: vi.fn(),
      onDone: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("No response body");
    vi.unstubAllGlobals();
  });

  it("streams content from SSE and calls onDelta and onDone", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    const chunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
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
    const { streamRewrite } = await import("@/lib/rewrite-api");
    const onDelta = vi.fn();
    const onDone = vi.fn();
    await streamRewrite({
      paragraphText: "text",
      instruction: "rewrite",
      tone: "dark",
      genre: "horror",
      premise: "A haunted house",
      surroundingContext: { before: "before", after: "after" },
      onDelta,
      onDone,
      onError: vi.fn(),
    });
    expect(onDelta).toHaveBeenCalledWith("Hello");
    expect(onDelta).toHaveBeenCalledWith(" world");
    expect(onDone).toHaveBeenCalledWith("Hello world");
    vi.unstubAllGlobals();
  });
});

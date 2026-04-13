import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const getAuthenticatedUserMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

function openAIStreamResponse(argumentsJson: unknown) {
  const chunk = JSON.stringify({
    choices: [
      {
        delta: {
          tool_calls: [
            {
              function: {
                arguments: JSON.stringify(argumentsJson),
              },
            },
          ],
        },
      },
    ],
  });

  return new Response(`data: ${chunk}\n\n`, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function createReq(overrides: Partial<VercelRequest> = {}) {
  return {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    query: { action: "title" },
    body: {},
    ...overrides,
  } as unknown as VercelRequest;
}

function createRes() {
  return {
    statusCode: 200,
    _body: undefined as unknown,
    _ended: false,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this._body = payload; return this; },
    end() { this._ended = true; return this; },
  } as unknown as VercelResponse & {
    statusCode: number;
    _body: unknown;
    _ended: boolean;
  };
}

describe("generate-chapter-title", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns one suggested chapter title", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    vi.mocked(fetch).mockResolvedValue(openAIStreamResponse({ title: "Ashes Under Glass" }));

    const handler = (await import("../../api/generate-chapter")).default;
    const res = createRes();
    await handler(
      createReq({
        body: {
          premise: "A crew follows a signal into a dead city.",
          tone: "Atmospheric",
          genre: "Mystery",
          summary: "They crossed the viaduct and found the observatory sealed from within.",
          beat: { phase: "rising", progress: 0.42 },
          recentNodes: [
            { id: "node-4", text: "They argued over the map.", startsChapter: true, chapterTitle: "Old title" },
            { id: "node-5", text: "The observatory windows reflected the marsh fire.", startsChapter: false, chapterTitle: null },
          ],
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res._body).toEqual({ title: "Ashes Under Glass" });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.tools[0].function.name).toBe("provide_chapter_title");
    expect(payload.tools[0].function.parameters.required).toEqual(["title"]);
    expect(payload.messages[0].content).toContain("exactly one chapter title");
  });
});

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
    query: { action: "suggestions" },
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

describe("generate-chapter-suggestions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns unauthorized when the request is not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);

    const handler = (await import("../../api/generate-chapter")).default;
    const res = createRes();
    await handler(
      createReq({ body: { recentNodes: [] } }),
      res
    );

    expect(getAuthenticatedUserMock).toHaveBeenCalledWith("Bearer token");
    expect(res.statusCode).toBe(401);
    expect(res._body).toEqual({ error: "Authentication required" });
  });

  it("requests at most two chapter suggestions for the active-path tail", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    vi.mocked(fetch).mockResolvedValue(
      openAIStreamResponse({
        suggestions: [
          {
            type: "start_new_chapter_here",
            anchorNodeId: "node-5",
            anchorParagraphIndex: 2,
            proposedTitle: "The Viaduct",
            reason: "Location shift and a new objective begin here.",
          },
          {
            type: "rename_recent_chapter",
            anchorNodeId: "node-4",
            anchorParagraphIndex: null,
            proposedTitle: "The Bargain",
            reason: "The chapter now centers on the pact.",
          },
        ],
      })
    );

    const handler = (await import("../../api/generate-chapter")).default;
    const res = createRes();
    await handler(
      createReq({
        body: {
          premise: "A distant signal calls the crew inland.",
          tone: "Atmospheric",
          genre: "Mystery",
          summary: "The crew crossed the marsh and found a ruined viaduct.",
          beat: { phase: "rising", progress: 0.46 },
          recentNodes: [
            { id: "node-4", text: "They argued over the map.", startsChapter: true, chapterTitle: "Old title" },
            {
              id: "node-5",
              text: "She crossed the viaduct at dusk.\n\nThe radio crackled again.\n\nA flare burned on the river.",
              startsChapter: false,
              chapterTitle: null,
              paragraphCount: 3,
            },
          ],
        },
      }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res._body).toEqual({
      suggestions: [
        expect.objectContaining({ type: "start_new_chapter_here", anchorNodeId: "node-5" }),
        expect.objectContaining({ type: "rename_recent_chapter", anchorNodeId: "node-4" }),
      ],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.messages[0].content).toContain("active branch");
    expect(payload.tools[0].function.parameters.properties.suggestions.maxItems).toBe(2);
  });

  it("filters out split suggestions with invalid paragraph positions", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2" });
    vi.mocked(fetch).mockResolvedValue(
      openAIStreamResponse({
        suggestions: [
          {
            type: "start_new_chapter_here",
            anchorNodeId: "node-5",
            anchorParagraphIndex: 2,
            proposedTitle: "Too Late",
            reason: "This should be filtered out.",
          },
          {
            type: "rename_recent_chapter",
            anchorNodeId: "node-4",
            anchorParagraphIndex: null,
            proposedTitle: "The Bargain",
            reason: "The chapter now centers on the pact.",
          },
        ],
      })
    );

    const handler = (await import("../../api/generate-chapter")).default;
    const res = createRes();
    await handler(
      createReq({
        body: {
          recentNodes: [
            {
              id: "node-4",
              text: "They argued over the map.",
              startsChapter: true,
              chapterTitle: "Old title",
              paragraphCount: 1,
            },
            {
              id: "node-5",
              text: "She crossed the viaduct at dusk.\n\nThe radio crackled again.",
              startsChapter: false,
              chapterTitle: null,
              paragraphCount: 2,
            },
          ],
        },
      }),
      res
    );

    expect(res._body).toEqual({
      suggestions: [
        expect.objectContaining({
          type: "rename_recent_chapter",
          anchorNodeId: "node-4",
        }),
      ],
    });
  });
});

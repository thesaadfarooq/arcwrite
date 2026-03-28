import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const unauthorizedResponseMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  unauthorizedResponse: unauthorizedResponseMock,
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

    const handler = (await import("../../api/generate-chapter-title")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-chapter-title", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({
          premise: "A crew follows a signal into a dead city.",
          tone: "Atmospheric",
          genre: "Mystery",
          summary: "They crossed the viaduct and found the observatory sealed from within.",
          beat: { phase: "rising", progress: 0.42 },
          recentNodes: [
            { id: "node-4", text: "They argued over the map.", startsChapter: true, chapterTitle: "Old title" },
            { id: "node-5", text: "The observatory windows reflected the marsh fire.", startsChapter: false, chapterTitle: null },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ title: "Ashes Under Glass" });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.tools[0].function.name).toBe("provide_chapter_title");
    expect(payload.tools[0].function.parameters.required).toEqual(["title"]);
    expect(payload.messages[0].content).toContain("exactly one chapter title");
  });
});

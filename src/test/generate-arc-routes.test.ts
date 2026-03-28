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

describe("story generation arc routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("uses beat-aware final-turn pacing in generate-section", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    vi.mocked(fetch).mockResolvedValue(
      new Response("data: {\"choices\":[{\"delta\":{\"content\":\"Done\"}}]}\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const handler = (await import("../../api/generate-section")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-section", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: "grim",
          premise: "A city under siege",
          length: "medium",
          beat: {
            phase: "resolution",
            progress: 0.94,
            phaseProgress: 0.7,
            turnsRemaining: 2,
            isNearEnd: true,
            isFinalSection: true,
          },
        }),
      })
    );

    expect(response.status).toBe(200);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const payload = JSON.parse(init?.body as string);
    expect(payload.messages[0].content).toContain("final section of the story");
    expect(payload.messages[0].content).toContain("Do not set up further choices");
  });

  it("expands the choice schema and phase prompt in generate-choices", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2" });
    vi.mocked(fetch).mockResolvedValue(
      openAIStreamResponse({
        choices: [
          { type: "resolve", label: "Put it to rest", preview: "The main thread closes." },
          { type: "emotional", label: "Say goodbye", preview: "A conversation lands softly." },
          { type: "explore", label: "Walk the ruins", preview: "A hidden truth emerges." },
          { type: "conclude", label: "End the tale", preview: "The story reaches its final beat." },
        ],
      })
    );

    const handler = (await import("../../api/generate-choices")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-choices", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({
          recentText: "Recent text",
          summary: "Summary",
          storyState: { mood: "tense" },
          beat: { phase: "falling", progress: 0.8, phaseProgress: 0.4, turnsRemaining: 6, isNearEnd: true },
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      choices: [
        { type: "resolve", label: "Put it to rest", preview: "The main thread closes." },
        { type: "emotional", label: "Say goodbye", preview: "A conversation lands softly." },
        { type: "explore", label: "Walk the ruins", preview: "A hidden truth emerges." },
        { type: "conclude", label: "End the tale", preview: "The story reaches its final beat." },
      ],
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const payload = JSON.parse(init?.body as string);
    const enumValues = payload.tools[0].function.parameters.properties.choices.items.properties.type.enum;
    expect(enumValues).toEqual([
      "safe",
      "risky",
      "emotional",
      "chaotic",
      "explore",
      "connect",
      "foreshadow",
      "complicate",
      "confront",
      "resolve",
      "conclude",
      "epilogue",
    ]);
    expect(payload.messages[0].content).toContain("falling");
    expect(payload.messages[0].content).toContain("conclude");
  });
});

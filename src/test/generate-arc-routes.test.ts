import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const getUserTierMock = vi.fn();
const unauthorizedResponseMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getUserTier: getUserTierMock,
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
    getUserTierMock.mockResolvedValue("pro");
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

  it("uses resumed-extension pacing instructions in generate-section", async () => {
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
          tone: "hopeful",
          premise: "The kingdom survived the war, but peace is unsettled.",
          length: "medium",
          arcMode: "resumed_extension",
          beat: {
            phase: "setup",
            progress: 0.12,
            phaseProgress: 0.35,
            turnsRemaining: 7,
            isNearEnd: false,
            isFinalSection: false,
          },
        }),
      })
    );

    expect(response.status).toBe(200);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.messages[0].content).toContain("resumed extension");
    expect(payload.messages[0].content).toContain("fresh arc");
    expect(payload.messages[0].content).toContain("do not simply restate the previous ending");
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

  it("requires one choice per preselected move family and includes post-ending context", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3" });
    vi.mocked(fetch).mockResolvedValue(
      openAIStreamResponse({
        choices: [
          { type: "resolve", label: "Survey the damage", preview: "They take stock of the aftermath." },
          { type: "emotional", label: "Face the old promise", preview: "A loose thread becomes personal." },
          { type: "explore", label: "Skip ahead to winter", preview: "Time reveals new strain lines." },
          { type: "complicate", label: "Meet the next threat", preview: "A new problem changes the peace." },
        ],
      })
    );

    const handler = (await import("../../api/generate-choices")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-choices", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({
          recentText: "The gates closed behind them as the coronation ended.",
          summary: "The rebellion won and the city entered an uneasy peace.",
          storyState: { crown: "restored" },
          tone: "bittersweet",
          genre: "fantasy",
          premise: "After a revolution, victory leaves unanswered costs.",
          arcMode: "post_ending",
          moveFamilies: ["aftermath", "loose_thread", "time_skip", "new_problem"],
          previousEnding: "epilogue",
          beat: { phase: "resolution", progress: 1, phaseProgress: 1, turnsRemaining: 0, isNearEnd: true },
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      choices: [
        { type: "resolve", label: "Survey the damage", preview: "They take stock of the aftermath." },
        { type: "emotional", label: "Face the old promise", preview: "A loose thread becomes personal." },
        { type: "explore", label: "Skip ahead to winter", preview: "Time reveals new strain lines." },
        { type: "complicate", label: "Meet the next threat", preview: "A new problem changes the peace." },
      ],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.tools[0].function.parameters.properties.choices.minItems).toBe(4);
    expect(payload.tools[0].function.parameters.properties.choices.maxItems).toBe(4);
    expect(payload.messages[0].content).toContain("Current arc mode: post_ending");
    expect(payload.messages[0].content).toContain("Previous ending beat: epilogue");
    expect(payload.messages[0].content).toContain("Generate exactly one choice for each required move family");
    expect(payload.messages[0].content).toContain("aftermath");
    expect(payload.messages[0].content).toContain("loose_thread");
    expect(payload.messages[0].content).toContain("time_skip");
    expect(payload.messages[0].content).toContain("new_problem");
  });

  it("returns 500 when OpenAI returns a non-200 for generate-choices", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-4" });
    vi.mocked(fetch).mockResolvedValue(
      new Response("Rate limited", { status: 429 })
    );

    const handler = (await import("../../api/generate-choices")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-choices", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ recentText: "Some text" }),
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to generate choices");
  });

  it("returns 500 when generate-choices stream contains malformed JSON", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-5" });
    // Stream has a malformed chunk followed by a valid done
    vi.mocked(fetch).mockResolvedValue(
      new Response("data: {invalid json}\ndata: [DONE]\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const handler = (await import("../../api/generate-choices")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-choices", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ recentText: "Some text" }),
      })
    );

    // The empty argsBuffer will fail JSON.parse, caught by outer catch
    expect(response.status).toBe(500);
  });

  it("returns 204 for OPTIONS on generate-choices", async () => {
    const handler = (await import("../../api/generate-choices")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-choices", { method: "OPTIONS" })
    );
    expect(response.status).toBe(204);
  });

  it("returns 429 when OpenAI rate-limits generate-section", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-6" });
    getUserTierMock.mockResolvedValue("free");
    vi.mocked(fetch).mockResolvedValue(
      new Response("Too Many Requests", { status: 429 })
    );

    const handler = (await import("../../api/generate-section")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-section", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "dark", length: "short" }),
      })
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toContain("Rate limited");
  });

  it("returns 500 when OpenAI returns a non-429 error for generate-section", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-7" });
    getUserTierMock.mockResolvedValue("free");
    vi.mocked(fetch).mockResolvedValue(
      new Response("Server Error", { status: 500 })
    );

    const handler = (await import("../../api/generate-section")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-section", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "dark", length: "medium" }),
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("AI generation failed");
  });

  it("returns 500 when generate-section throws (missing API key)", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-8" });
    getUserTierMock.mockResolvedValue("free");
    delete process.env.OPENAI_API_KEY;

    const handler = (await import("../../api/generate-section")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-section", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "dark", length: "medium" }),
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("OPENAI_API_KEY is not configured");
  });

  it("includes storyState in the system prompt for generate-section", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-9" });
    getUserTierMock.mockResolvedValue("pro");
    vi.mocked(fetch).mockResolvedValue(
      new Response("data: {\"choices\":[{\"delta\":{\"content\":\"Text\"}}]}\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const handler = (await import("../../api/generate-section")).default;
    await handler(
      new Request("http://localhost/api/generate-section", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: "dark",
          length: "medium",
          storyState: { tension: "high", location: "castle" },
        }),
      })
    );

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.messages[0].content).toContain("STORY STATE");
    expect(payload.messages[0].content).toContain("castle");
  });

  it("returns 204 for OPTIONS on generate-section", async () => {
    const handler = (await import("../../api/generate-section")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-section", { method: "OPTIONS" })
    );
    expect(response.status).toBe(204);
  });
});

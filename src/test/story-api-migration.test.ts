import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = {
  createStory: vi.fn(),
  createNode: vi.fn(),
  getNodes: vi.fn(),
  getStory: vi.fn(),
  updateStory: vi.fn(),
  updateNode: vi.fn(),
  jumpToNode: vi.fn(),
  deleteNodeSubtree: vi.fn(),
  splitNode: vi.fn(),
  mergeNode: vi.fn(),
  generateChapterSuggestions: vi.fn(),
  generateChapterTitle: vi.fn(),
};

vi.mock("@/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "token" } } }),
    },
  },
}));

describe("story-api Postgres migration wrappers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates stories through the API client without relying on a user id field", async () => {
    apiClientMock.createStory.mockResolvedValue({ id: "story-1" });
    const storyApi = await import("@/lib/story-api");

    await storyApi.createStory({
      userId: "user-1",
      title: "New Story",
      genre: "fantasy",
      tone: "dark",
      premise: "A lost map",
      targetTurns: 42,
    });

    expect(apiClientMock.createStory).toHaveBeenCalledWith({
      title: "New Story",
      genre: "fantasy",
      tone: "dark",
      premise: "A lost map",
      status: "in_progress",
      target_turns: 42,
    });
  });

  it("creates story nodes with root chapter defaults", async () => {
    apiClientMock.createNode.mockResolvedValue({ id: "node-1" });
    const storyApi = await import("@/lib/story-api");

    await storyApi.createStoryNode({
      storyId: "story-1",
      text: "Opening",
      summary: "Summary",
      storyState: { mood: "tense" },
      choices: [{ type: "safe", label: "Go left", preview: "Take the safer road." }],
    });

    expect(apiClientMock.createNode).toHaveBeenCalledWith({
      story_id: "story-1",
      parent_id: null,
      text: "Opening",
      summary: "Summary",
      story_state: { mood: "tense" },
      choices: [{ type: "safe", label: "Go left", preview: "Take the safer road." }],
      chosen_option: null,
      starts_chapter: true,
      branch_id: null,
    });
  });

  it("fetches active and all nodes through the API client", async () => {
    apiClientMock.getNodes.mockResolvedValue([{ id: "node-1" }]);
    const storyApi = await import("@/lib/story-api");

    await storyApi.getStoryNodes("story-2");
    await storyApi.getAllStoryNodes("story-2");

    expect(apiClientMock.getNodes).toHaveBeenNthCalledWith(1, "story-2");
    expect(apiClientMock.getNodes).toHaveBeenNthCalledWith(2, "story-2", { active: false });
  });

  it("updates story metadata through the API client", async () => {
    const storyApi = await import("@/lib/story-api");

    await storyApi.updateStoryTitle("story-3", "Renamed");
    await storyApi.updateStoryTone("story-3", "Whimsical");

    expect(apiClientMock.updateStory).toHaveBeenNthCalledWith(1, "story-3", { title: "Renamed" });
    expect(apiClientMock.updateStory).toHaveBeenNthCalledWith(2, "story-3", { tone: "Whimsical" });
  });

  it("passes beat and arc mode through section generation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const storyApi = await import("@/lib/story-api");

    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await storyApi.streamSection({
      premise: "A ruined city",
      genre: "fantasy",
      tone: "grim",
      summary: "Summary",
      recentText: "Recent text",
      storyState: { mood: "tense" },
      length: "medium",
      arcMode: "resumed_extension",
      beat: { phase: "rising", progress: 0.32, phaseProgress: 0.4, turnsRemaining: 28, isNearEnd: false },
      onDelta,
      onDone,
      onError,
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      premise: "A ruined city",
      genre: "fantasy",
      tone: "grim",
      summary: "Summary",
      recentText: "Recent text",
      storyState: { mood: "tense" },
      length: "medium",
      arcMode: "resumed_extension",
      beat: {
        phase: "rising",
        progress: 0.32,
        phaseProgress: 0.4,
        turnsRemaining: 28,
        isNearEnd: false,
      },
    });
    expect(onDelta).toHaveBeenCalledWith("Hello");
    expect(onDone).toHaveBeenCalledWith("Hello");
    expect(onError).not.toHaveBeenCalled();
  });

  it("passes beat, arc mode, and move metadata through choice generation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        choices: [{ type: "resolve", label: "Tie it up", preview: "The story settles into closure." }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const storyApi = await import("@/lib/story-api");

    await expect(
      storyApi.generateChoices({
        recentText: "Recent text",
        summary: "Summary",
        storyState: { mood: "tense" },
        tone: "grim",
        genre: "fantasy",
        premise: "A ruined city",
        arcMode: "post_ending",
        moveFamilies: ["aftermath", "loose_thread", "time_skip", "new_problem"],
        previousEnding: "epilogue",
        beat: { phase: "falling", progress: 0.78, phaseProgress: 0.2, turnsRemaining: 9, isNearEnd: true },
      })
    ).resolves.toEqual([
      { type: "resolve", label: "Tie it up", preview: "The story settles into closure." },
    ]);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body).toMatchObject({
      recentText: "Recent text",
      summary: "Summary",
      storyState: { mood: "tense" },
      tone: "grim",
      genre: "fantasy",
      premise: "A ruined city",
      arcMode: "post_ending",
      moveFamilies: ["aftermath", "loose_thread", "time_skip", "new_problem"],
      previousEnding: "epilogue",
      beat: expect.objectContaining({ phase: "falling" }),
    });
  });

  it("routes chapter suggestion generation through the API client", async () => {
    apiClientMock.generateChapterSuggestions.mockResolvedValue({
      suggestions: [
        {
          type: "rename_recent_chapter",
          anchorNodeId: "node-3",
          anchorParagraphIndex: null,
          proposedTitle: "The Bargain",
          reason: "The conflict has crystallized.",
        },
      ],
    });
    const storyApi = await import("@/lib/story-api");

    await expect(
      storyApi.generateChapterSuggestions({
        recentNodes: [{ id: "node-3", text: "A bargain is struck.", startsChapter: true, chapterTitle: "Chapter 2" }],
        beat: { phase: "falling", progress: 0.76 },
      })
    ).resolves.toEqual([
      expect.objectContaining({ type: "rename_recent_chapter", anchorNodeId: "node-3" }),
    ]);
  });

  it("routes chapter title generation through the API client", async () => {
    apiClientMock.generateChapterTitle.mockResolvedValue({
      title: "Ashes Under Glass",
    });
    const storyApi = await import("@/lib/story-api");

    await expect(
      storyApi.generateChapterTitle({
        recentNodes: [{ id: "node-3", text: "A bargain is struck.", startsChapter: true, chapterTitle: "Chapter 2" }],
        premise: "A crew follows a signal into a dead city.",
        tone: "Atmospheric",
        genre: "Mystery",
        summary: "They crossed the viaduct and found the observatory sealed from within.",
        beat: { phase: "falling", progress: 0.76 },
      })
    ).resolves.toBe("Ashes Under Glass");

    expect(apiClientMock.generateChapterTitle).toHaveBeenCalledWith({
      recentNodes: [{ id: "node-3", text: "A bargain is struck.", startsChapter: true, chapterTitle: "Chapter 2" }],
      premise: "A crew follows a signal into a dead city.",
      tone: "Atmospheric",
      genre: "Mystery",
      summary: "They crossed the viaduct and found the observatory sealed from within.",
      beat: { phase: "falling", progress: 0.76 },
    });
  });

  it("routes node operations through the matching API endpoints", async () => {
    apiClientMock.deleteNodeSubtree.mockResolvedValue({ success: true, parentId: "parent-1" });
    apiClientMock.splitNode.mockResolvedValue({ id: "split-node" });
    apiClientMock.mergeNode.mockResolvedValue({ success: true, parentId: "parent-2" });
    const storyApi = await import("@/lib/story-api");

    await storyApi.jumpToNode("story-4", "node-4");
    await storyApi.updateNodeChapterTitle("node-4", "Chapter Four");
    await expect(storyApi.deleteNodeAndDescendants("story-4", "node-4")).resolves.toBe("parent-1");
    await expect(storyApi.splitNodeAtPosition("story-4", "node-5", 2)).resolves.toEqual({ id: "split-node" });
    await expect(storyApi.mergeNodeWithParent("story-4", "node-6")).resolves.toBe("parent-2");

    expect(apiClientMock.jumpToNode).toHaveBeenCalledWith("node-4");
    expect(apiClientMock.updateNode).toHaveBeenCalledWith("node-4", { chapter_title: "Chapter Four" });
    expect(apiClientMock.deleteNodeSubtree).toHaveBeenCalledWith("node-4");
    expect(apiClientMock.splitNode).toHaveBeenCalledWith("node-5", 2);
    expect(apiClientMock.mergeNode).toHaveBeenCalledWith("node-6");
  });
});

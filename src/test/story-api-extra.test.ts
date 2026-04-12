import { describe, expect, it, vi, beforeEach } from "vitest";

const mockApiClient = {
  getStory: vi.fn(),
  getNodes: vi.fn(),
  updateStory: vi.fn(),
  jumpToNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNodeSubtree: vi.fn(),
  generateChapterSuggestions: vi.fn(),
  generateChapterTitle: vi.fn(),
};

vi.mock("@/lib/api-client", () => ({
  apiClient: mockApiClient,
  getAuthToken: vi.fn().mockResolvedValue("tok"),
}));

describe("story-api delegation functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStory delegates to apiClient", async () => {
    mockApiClient.getStory.mockResolvedValue({ id: "s1", title: "Test" });
    const { getStory } = await import("@/lib/story-api");
    const result = await getStory("s1");
    expect(mockApiClient.getStory).toHaveBeenCalledWith("s1");
    expect(result.title).toBe("Test");
  });

  it("getStoryNodes delegates with active filtering", async () => {
    mockApiClient.getNodes.mockResolvedValue([{ id: "n1" }]);
    const { getStoryNodes } = await import("@/lib/story-api");
    await getStoryNodes("s1");
    expect(mockApiClient.getNodes).toHaveBeenCalledWith("s1");
  });

  it("getAllStoryNodes gets all nodes", async () => {
    mockApiClient.getNodes.mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    const { getAllStoryNodes } = await import("@/lib/story-api");
    await getAllStoryNodes("s1");
    expect(mockApiClient.getNodes).toHaveBeenCalledWith("s1", { active: false });
  });

  it("updateStoryTitle delegates", async () => {
    mockApiClient.updateStory.mockResolvedValue(undefined);
    const { updateStoryTitle } = await import("@/lib/story-api");
    await updateStoryTitle("s1", "New Title");
    expect(mockApiClient.updateStory).toHaveBeenCalledWith("s1", { title: "New Title" });
  });

  it("updateStoryTone delegates", async () => {
    mockApiClient.updateStory.mockResolvedValue(undefined);
    const { updateStoryTone } = await import("@/lib/story-api");
    await updateStoryTone("s1", "dark");
    expect(mockApiClient.updateStory).toHaveBeenCalledWith("s1", { tone: "dark" });
  });

  it("jumpToNode delegates", async () => {
    mockApiClient.jumpToNode.mockResolvedValue(undefined);
    const { jumpToNode } = await import("@/lib/story-api");
    await jumpToNode("s1", "n1");
    expect(mockApiClient.jumpToNode).toHaveBeenCalledWith("n1");
  });

  it("deactivateNodesAfter delegates to jumpToNode", async () => {
    mockApiClient.jumpToNode.mockResolvedValue(undefined);
    const { deactivateNodesAfter } = await import("@/lib/story-api");
    await deactivateNodesAfter("s1", "n1");
    expect(mockApiClient.jumpToNode).toHaveBeenCalledWith("n1");
  });

  it("updateNodeChapterTitle delegates", async () => {
    mockApiClient.updateNode.mockResolvedValue(undefined);
    const { updateNodeChapterTitle } = await import("@/lib/story-api");
    await updateNodeChapterTitle("n1", "Chapter 1");
    expect(mockApiClient.updateNode).toHaveBeenCalledWith("n1", { chapter_title: "Chapter 1" });
  });

  it("deleteNodeAndDescendants delegates", async () => {
    mockApiClient.deleteNodeSubtree.mockResolvedValue({ deleted: true });
    const { deleteNodeAndDescendants } = await import("@/lib/story-api");
    await deleteNodeAndDescendants("s1", "n1");
    expect(mockApiClient.deleteNodeSubtree).toHaveBeenCalledWith("n1");
  });

  it("generateChoices throws on non-ok response with error JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Bad request" }),
    }));
    const { generateChoices } = await import("@/lib/story-api");
    await expect(generateChoices({ recentText: "text" })).rejects.toThrow("Bad request");
    vi.unstubAllGlobals();
  });

  it("generateChoices throws fallback on non-ok response with broken JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("parse error")),
    }));
    const { generateChoices } = await import("@/lib/story-api");
    await expect(generateChoices({ recentText: "text" })).rejects.toThrow("Failed to generate choices");
    vi.unstubAllGlobals();
  });

  it("summarizeStory returns summary and story_state on success", async () => {
    const mockResult = { summary: "A hero emerged.", story_state: { mood: "hopeful" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResult),
    }));
    const { summarizeStory } = await import("@/lib/story-api");
    const result = await summarizeStory({ fullText: "Once upon a time..." });
    expect(result).toEqual(mockResult);
    expect(fetch).toHaveBeenCalledWith("/api/summarize", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer tok" }),
    }));
    vi.unstubAllGlobals();
  });

  it("summarizeStory throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Summarize failed" }),
    }));
    const { summarizeStory } = await import("@/lib/story-api");
    await expect(summarizeStory({ fullText: "text" })).rejects.toThrow("Summarize failed");
    vi.unstubAllGlobals();
  });

  it("summarizeStory throws fallback on non-ok with broken JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("parse")),
    }));
    const { summarizeStory } = await import("@/lib/story-api");
    await expect(summarizeStory({ fullText: "text" })).rejects.toThrow("Failed to summarize");
    vi.unstubAllGlobals();
  });

  it("generateChapterSuggestions delegates and returns suggestions", async () => {
    mockApiClient.generateChapterSuggestions.mockResolvedValue({
      suggestions: [{ title: "Ch 1", reason: "test" }],
    });
    const { generateChapterSuggestions } = await import("@/lib/story-api");
    const result = await generateChapterSuggestions({
      recentNodes: [{ id: "n1", text: "text", startsChapter: false, chapterTitle: null }],
    });
    expect(result).toEqual([{ title: "Ch 1", reason: "test" }]);
  });

  it("generateChapterSuggestions returns empty array when no suggestions", async () => {
    mockApiClient.generateChapterSuggestions.mockResolvedValue({});
    const { generateChapterSuggestions } = await import("@/lib/story-api");
    const result = await generateChapterSuggestions({
      recentNodes: [{ id: "n1", text: "text", startsChapter: false, chapterTitle: null }],
    });
    expect(result).toEqual([]);
  });

  it("generateChapterTitle delegates and returns title", async () => {
    mockApiClient.generateChapterTitle.mockResolvedValue({ title: "The Beginning" });
    const { generateChapterTitle } = await import("@/lib/story-api");
    const result = await generateChapterTitle({
      recentNodes: [{ id: "n1", text: "text", startsChapter: false, chapterTitle: null }],
    });
    expect(result).toBe("The Beginning");
  });
});

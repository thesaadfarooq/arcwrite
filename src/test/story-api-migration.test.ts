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
    });

    expect(apiClientMock.createStory).toHaveBeenCalledWith({
      title: "New Story",
      genre: "fantasy",
      tone: "dark",
      premise: "A lost map",
      status: "in_progress",
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
      choices: [{ label: "Go left" }],
    });

    expect(apiClientMock.createNode).toHaveBeenCalledWith({
      story_id: "story-1",
      parent_id: null,
      text: "Opening",
      summary: "Summary",
      story_state: { mood: "tense" },
      choices: [{ label: "Go left" }],
      chosen_option: null,
      starts_chapter: true,
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

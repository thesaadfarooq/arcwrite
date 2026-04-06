import { describe, expect, it, vi, beforeEach } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: getSessionMock },
  },
}));

describe("apiClient extended coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  });

  it("getProfile calls the correct endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ user_id: "u1", display_name: "Test", avatar_url: null, tier: "free" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    const result = await apiClient.getProfile();
    expect(result.user_id).toBe("u1");
    expect(fetch).toHaveBeenCalledWith("/api/db/profile", expect.objectContaining({ method: "GET" }));
    vi.unstubAllGlobals();
  });

  it("createStory sends POST with body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ id: "new-s1" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    const result = await apiClient.createStory({ title: "New Story", genre: "fantasy" });
    expect(result.id).toBe("new-s1");
    expect(fetch).toHaveBeenCalledWith("/api/db/stories", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ title: "New Story", genre: "fantasy" }),
    }));
    vi.unstubAllGlobals();
  });

  it("updateStory sends PATCH", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ id: "s1", title: "Updated" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.updateStory("s1", { title: "Updated" });
    expect(fetch).toHaveBeenCalledWith("/api/db/stories?id=s1", expect.objectContaining({ method: "PATCH" }));
    vi.unstubAllGlobals();
  });

  it("deleteStory sends DELETE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ success: true }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.deleteStory("s1");
    expect(fetch).toHaveBeenCalledWith("/api/db/stories?id=s1", expect.objectContaining({ method: "DELETE" }));
    vi.unstubAllGlobals();
  });

  it("getStoryCount extracts count from response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ count: 5 }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    const count = await apiClient.getStoryCount();
    expect(count).toBe(5);
    vi.unstubAllGlobals();
  });

  it("getNodes passes active=all when active is false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve([]),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.getNodes("s1", { active: false });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("active=all"),
      expect.anything()
    );
    vi.unstubAllGlobals();
  });

  it("createNode sends POST", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ id: "n1" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.createNode({ story_id: "s1", text: "Hello" });
    expect(fetch).toHaveBeenCalledWith("/api/db/nodes", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });

  it("jumpToNode, splitNode, mergeNode send correct actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ success: true }),
    }));
    const { apiClient } = await import("@/lib/api-client");

    await apiClient.jumpToNode("n1");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("action=jump"), expect.anything());

    await apiClient.splitNode("n1", 5);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("action=split"), expect.anything());

    await apiClient.mergeNode("n1");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("action=merge"), expect.anything());
    vi.unstubAllGlobals();
  });

  it("deleteNodeSubtree sends DELETE with subtree action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ success: true, parentId: "n0" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.deleteNodeSubtree("n1");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("action=subtree"), expect.objectContaining({ method: "DELETE" }));
    vi.unstubAllGlobals();
  });

  it("getSharedStory does not require auth", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ story: {}, nodes: [] }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.getSharedStory("abc123");
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    // Should NOT have Authorization header
    expect(fetchCall[1].headers.Authorization).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("throws on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ error: "Not found" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await expect(apiClient.getStory("missing")).rejects.toThrow("Not found");
    vi.unstubAllGlobals();
  });

  it("throws when not authenticated", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal("fetch", vi.fn());
    const { apiClient } = await import("@/lib/api-client");
    await expect(apiClient.getStories()).rejects.toThrow("Not authenticated");
    vi.unstubAllGlobals();
  });

  it("generateChapterSuggestions and generateChapterTitle work", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ suggestions: [], title: "Chapter One" }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.generateChapterSuggestions({ storyId: "s1" });
    await apiClient.generateChapterTitle({ storyId: "s1" });
    expect(fetch).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("getBranches, createBranch, promoteBranch, renameBranch, deleteBranch work", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: () => Promise.resolve({ success: true }),
    }));
    const { apiClient } = await import("@/lib/api-client");
    await apiClient.getBranches("s1");
    await apiClient.createBranch({ story_id: "s1", fork_node_id: "n1" });
    await apiClient.promoteBranch("b1");
    await apiClient.renameBranch("b1", "New name");
    await apiClient.deleteBranch("b1");
    expect(fetch).toHaveBeenCalledTimes(5);
    vi.unstubAllGlobals();
  });
});

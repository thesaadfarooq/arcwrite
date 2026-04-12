import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, setTokenGetter } from "@/lib/api-client";

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTokenGetter(() => Promise.resolve("session-token"));
    vi.stubGlobal("fetch", vi.fn());
  });

  it("attaches the current auth token when fetching stories", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: "story-1" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const stories = await apiClient.getStories();

    expect(fetchMock).toHaveBeenCalledWith("/api/db/stories", {
      method: "GET",
      headers: {
        Authorization: "Bearer session-token",
      },
    });
    expect(stories).toEqual([{ id: "story-1" }]);
  });

  it("posts JSON bodies for authenticated writes", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "story-2" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiClient.createStory({ title: "New Story", premise: "Idea" });

    expect(fetchMock).toHaveBeenCalledWith("/api/db/stories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer session-token",
      },
      body: JSON.stringify({ title: "New Story", premise: "Idea" }),
    });
  });

  it("returns the numeric story count from the count endpoint", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ count: 4 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiClient.getStoryCount()).resolves.toBe(4);
  });

  it("allows public shared-story requests without a session token", async () => {
    setTokenGetter(() => Promise.resolve(null));
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ story: { id: "story-3" }, nodes: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiClient.getSharedStory("share-token");

    expect(fetchMock).toHaveBeenCalledWith("/api/db/shared/share-token", {
      method: "GET",
      headers: {},
    });
  });

  it("posts authenticated chapter review requests", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiClient.generateChapterSuggestions({
      recentNodes: [{ id: "node-1", text: "Text", startsChapter: true, chapterTitle: "Arrival" }],
      beat: { phase: "rising", progress: 0.4 },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/generate-chapter-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer session-token",
      },
      body: JSON.stringify({
        recentNodes: [{ id: "node-1", text: "Text", startsChapter: true, chapterTitle: "Arrival" }],
        beat: { phase: "rising", progress: 0.4 },
      }),
    });
  });

  it("posts authenticated chapter title requests", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ title: "Ashes Under Glass" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiClient.generateChapterTitle({
      recentNodes: [{ id: "node-1", text: "Text", startsChapter: true, chapterTitle: "Arrival" }],
      beat: { phase: "falling", progress: 0.74 },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/generate-chapter-title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer session-token",
      },
      body: JSON.stringify({
        recentNodes: [{ id: "node-1", text: "Text", startsChapter: true, chapterTitle: "Arrival" }],
        beat: { phase: "falling", progress: 0.74 },
      }),
    });
  });

  it("throws the API error message when a request fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(apiClient.getStories()).rejects.toThrow("Unauthorized");
  });
});

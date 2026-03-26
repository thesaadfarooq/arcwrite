import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

describe("api-client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "session-token",
        },
      },
    });
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

    const { apiClient } = await import("@/lib/api-client");
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

    const { apiClient } = await import("@/lib/api-client");
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

    const { apiClient } = await import("@/lib/api-client");

    await expect(apiClient.getStoryCount()).resolves.toBe(4);
  });

  it("allows public shared-story requests without a session token", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ story: { id: "story-3" }, nodes: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { apiClient } = await import("@/lib/api-client");
    await apiClient.getSharedStory("share-token");

    expect(fetchMock).toHaveBeenCalledWith("/api/db/shared/share-token", {
      method: "GET",
      headers: {},
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

    const { apiClient } = await import("@/lib/api-client");

    await expect(apiClient.getStories()).rejects.toThrow("Unauthorized");
  });
});

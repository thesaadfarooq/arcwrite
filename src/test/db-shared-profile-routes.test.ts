import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const ensureProfileMock = vi.fn();
const queryMock = vi.fn();
const queryOneMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("../../api/_auth", () => ({
  ensureProfile: ensureProfileMock,
}));

vi.mock("../../api/_db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
}));

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

describe("db shared and profile routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requesting the profile without authentication", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/profile")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: {},
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("ensures the profile row and returns the profile for an authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    ensureProfileMock.mockResolvedValue("user-1");
    queryOneMock.mockResolvedValue({
      user_id: "user-1",
      display_name: "Ari",
      avatar_url: null,
      tier: "free",
      tier_override: null,
    });
    const handler = (await import("../../api/db/profile")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as any,
      res as any
    );

    expect(getAuthenticatedUserMock).toHaveBeenCalledWith("Bearer token");
    expect(ensureProfileMock).toHaveBeenCalledWith("user-1");
    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("SELECT user_id, display_name, avatar_url, tier, tier_override FROM profiles WHERE user_id = $1"),
      ["user-1"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      user_id: "user-1",
      display_name: "Ari",
      avatar_url: null,
      tier: "free",
      tier_override: null,
    });
  });

  it("returns the shared story and active nodes ordered by creation time", async () => {
    queryOneMock.mockResolvedValue({
      id: "story-1",
      title: "Shared Story",
      genre: "Fantasy",
      premise: "A quest begins",
    });
    queryMock.mockResolvedValue([
      { id: "node-1", text: "First", created_at: "2026-03-26T10:00:00Z" },
      { id: "node-2", text: "Second", created_at: "2026-03-26T11:00:00Z" },
    ]);
    const handler = (await import("../../api/db/shared/[token]")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { token: "share-token" },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("SELECT id, title, genre, premise FROM stories WHERE share_token = $1"),
      ["share-token"]
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("WHERE story_id = $1 AND is_active = true"),
      ["story-1"]
    );
    expect(queryMock.mock.calls[0][0]).toContain("ORDER BY created_at ASC");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      story: {
        id: "story-1",
        title: "Shared Story",
        genre: "Fantasy",
        premise: "A quest begins",
      },
      nodes: [
        { id: "node-1", text: "First", created_at: "2026-03-26T10:00:00Z" },
        { id: "node-2", text: "Second", created_at: "2026-03-26T11:00:00Z" },
      ],
    });
  });

  it("returns 404 when the shared token does not match a story", async () => {
    queryOneMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/shared/[token]")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { token: "missing-token" },
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns a generic 500 when the profile route fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2" });
    ensureProfileMock.mockResolvedValue("user-2");
    queryOneMock.mockRejectedValue(new Error("db exploded"));
    const handler = (await import("../../api/db/profile")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});

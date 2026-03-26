import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const ensureProfileMock = vi.fn();
const queryMock = vi.fn();
const queryOneMock = vi.fn();
const queryCountMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("../../api/_auth", () => ({
  ensureProfile: ensureProfileMock,
}));

vi.mock("../../api/_db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  queryCount: queryCountMock,
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

describe("story database routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when listing stories without an authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/stories")).default;
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

  it("lists stories for the authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    queryMock.mockResolvedValue([{ id: "story-1", title: "Story" }]);
    const handler = (await import("../../api/db/stories")).default;
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
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM stories WHERE user_id = $1"),
      ["user-1"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "story-1", title: "Story" }]);
  });

  it("creates a story with default values for missing fields", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2" });
    queryOneMock.mockResolvedValue({ id: "story-2", title: "Untitled Story" });
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer token" },
        body: {},
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO stories"),
      ["user-2", "Untitled Story", null, null, null, "in_progress"]
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: "story-2", title: "Untitled Story" });
  });

  it("returns a generic 500 when story listing fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    queryMock.mockRejectedValue(new Error("db blew up"));
    const handler = (await import("../../api/db/stories")).default;
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

  it("patches only the provided story fields", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3" });
    queryOneMock.mockResolvedValue({ id: "story-3", title: "Renamed" });
    const handler = (await import("../../api/db/stories/[id]")).default;
    const res = createResponse();

    await handler(
      {
        method: "PATCH",
        query: { id: "story-3" },
        headers: { authorization: "Bearer token" },
        body: { title: "Renamed", share_token: "share-me" },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE stories SET title = $1, share_token = $2"),
      ["Renamed", "share-me", "story-3", "user-3"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: "story-3", title: "Renamed" });
  });

  it("returns 404 when deleting a story that is not owned by the user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-4" });
    queryMock.mockResolvedValue([]);
    const handler = (await import("../../api/db/stories/[id]")).default;
    const res = createResponse();

    await handler(
      {
        method: "DELETE",
        query: { id: "story-4" },
        headers: { authorization: "Bearer token" },
        body: {},
      } as any,
      res as any
    );

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("returns the authenticated user's story count", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-5" });
    queryCountMock.mockResolvedValue(7);
    const handler = (await import("../../api/db/stories/count")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        headers: { authorization: "Bearer token" },
      } as any,
      res as any
    );

    expect(queryCountMock).toHaveBeenCalledWith(
      expect.stringContaining("SELECT COUNT(*) FROM stories WHERE user_id = $1"),
      ["user-5"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ count: 7 });
  });
});

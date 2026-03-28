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
        query: {},
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
        query: {},
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
        query: {},
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

  it("creates a story with target turns and arc override", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2b" });
    queryOneMock.mockResolvedValue({ id: "story-2b", title: "Finite Story" });
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          title: "Finite Story",
          targetTurns: 45,
          arcOverride: "concluding",
        },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO stories"),
      ["user-2b", "Finite Story", null, null, null, "in_progress", 45, "concluding"]
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: "story-2b", title: "Finite Story" });
  });

  it("creates a story with arc state metadata", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2c" });
    const arcState = {
      segmentStartTurn: 7,
      bufferTurnsUsed: 1,
      endedWith: "conclude",
      resumeStrength: null,
      extensionTargetTurns: null,
    };
    queryOneMock.mockResolvedValue({ id: "story-2c", title: "Arc Story", arc_state: arcState });
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          title: "Arc Story",
          arc_state: arcState,
        },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO stories"),
      ["user-2c", "Arc Story", null, null, null, "in_progress", arcState]
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: "story-2c", title: "Arc Story", arc_state: arcState });
  });

  it("returns a generic 500 when story listing fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    queryMock.mockRejectedValue(new Error("db blew up"));
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: {},
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
    const handler = (await import("../../api/db/stories")).default;
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

  it("patches target turns and arc override", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3b" });
    queryOneMock.mockResolvedValue({ id: "story-3b", target_turns: 18, arc_override: "concluding" });
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "PATCH",
        query: { id: "story-3b" },
        headers: { authorization: "Bearer token" },
        body: { targetTurns: 18, arcOverride: "concluding" },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE stories SET target_turns = $1, arc_override = $2"),
      [18, "concluding", "story-3b", "user-3b"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: "story-3b", target_turns: 18, arc_override: "concluding" });
  });

  it("patches arc override and arc state metadata together", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3bb" });
    const arcState = {
      segmentStartTurn: 12,
      bufferTurnsUsed: 0,
      endedWith: "epilogue",
      resumeStrength: null,
      extensionTargetTurns: null,
    };
    queryOneMock.mockResolvedValue({
      id: "story-3bb",
      arc_override: "concluding",
      arc_state: arcState,
    });
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "PATCH",
        query: { id: "story-3bb" },
        headers: { authorization: "Bearer token" },
        body: { arcOverride: "concluding", arcState: arcState },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE stories SET arc_override = $1, arc_state = $2"),
      ["concluding", arcState, "story-3bb", "user-3bb"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: "story-3bb",
      arc_override: "concluding",
      arc_state: arcState,
    });
  });

  it("deduplicates mixed-case aliases that map to the same patched column", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3c" });
    queryOneMock.mockResolvedValue({ id: "story-3c", target_turns: 18 });
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "PATCH",
        query: { id: "story-3c" },
        headers: { authorization: "Bearer token" },
        body: { targetTurns: 18, target_turns: 35 },
      } as any,
      res as any
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE stories SET target_turns = $1"),
      [18, "story-3c", "user-3c"]
    );
    expect(res.statusCode).toBe(200);
  });

  it("returns 404 when deleting a story that is not owned by the user", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-4" });
    queryMock.mockResolvedValue([]);
    const handler = (await import("../../api/db/stories")).default;
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
    const handler = (await import("../../api/db/stories")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { count: "true" },
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

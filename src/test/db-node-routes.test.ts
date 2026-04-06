import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const getAuthenticatedUserMock = vi.fn();
const ensureProfileMock = vi.fn();
const queryMock = vi.fn();
const queryOneMock = vi.fn();
const withTransactionMock = vi.fn();
const transactionQueryMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("../../api/_auth", () => ({
  ensureProfile: ensureProfileMock,
}));

vi.mock("../../api/_db", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  withTransaction: withTransactionMock,
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

describe("node database routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTransactionMock.mockImplementation(async (fn) =>
      fn({
        query: transactionQueryMock,
      })
    );
  });

  it("returns 401 when listing nodes without an authenticated user", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { story_id: "story-1" },
        headers: {},
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when listing nodes for a story the user does not own", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    queryOneMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { story_id: "story-1" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("FROM stories"),
      ["story-1", "user-1"]
    );
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("filters nodes to the active path unless active=all", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-2" });
    queryOneMock.mockResolvedValue({ id: "story-2" });
    queryMock.mockResolvedValue([{ id: "node-1" }]);
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { story_id: "story-2" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(ensureProfileMock).toHaveBeenCalledWith("user-2");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("AND is_active = true"),
      ["story-2"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "node-1" }]);
  });

  it("returns all nodes when active=all", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-3" });
    queryOneMock.mockResolvedValue({ id: "story-3" });
    queryMock.mockResolvedValue([{ id: "node-1" }, { id: "node-2" }]);
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { story_id: "story-3", active: "all" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    const [sql] = queryMock.mock.calls[0];
    expect(sql).not.toContain("is_active = true");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "node-1" }, { id: "node-2" }]);
  });

  it("creates a root node with JSON defaults and chapter defaults", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-4" });
    queryOneMock
      .mockResolvedValueOnce({ id: "story-4" })
      .mockResolvedValueOnce({ id: "node-4", starts_chapter: true });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: {},
        headers: { authorization: "Bearer token" },
        body: {
          story_id: "story-4",
          text: "Opening paragraph",
        },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(queryOneMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO story_nodes"),
      [
        "story-4",
        null,
        "Opening paragraph",
        null,
        JSON.stringify({}),
        JSON.stringify([]),
        null,
        true,
        null,
      ]
    );
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: "node-4", starts_chapter: true });
  });

  it("returns 404 when patching a node outside the user's story", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-5" });
    queryOneMock.mockResolvedValueOnce(null);
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "PATCH",
        query: { id: "node-5" },
        headers: { authorization: "Bearer token" },
        body: { text: "Updated" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("JOIN stories s ON s.id = sn.story_id"),
      ["node-5", "user-5"]
    );
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("patches only allowed node fields", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-6" });
    queryOneMock
      .mockResolvedValueOnce({ id: "node-6" })
      .mockResolvedValueOnce({ id: "node-6", text: "Updated" });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "PATCH",
        query: { id: "node-6" },
        headers: { authorization: "Bearer token" },
        body: {
          text: "Updated",
          chapter_title: "Chapter Two",
          story_id: "other-story",
          created_at: "yesterday",
        },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    const [sql, params] = queryOneMock.mock.calls[1];
    expect(sql).toContain("UPDATE story_nodes");
    expect(sql).toContain("SET text = $1, chapter_title = $2");
    expect(sql).toContain("s.user_id");
    expect(sql).not.toContain("created_at");
    expect(params).toEqual(["Updated", "Chapter Two", "node-6", "user-6"]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ id: "node-6", text: "Updated" });
  });

  it("jumps to a node inside a transaction and returns success", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-7" });
    queryOneMock.mockResolvedValue({ story_id: "story-7" });
    transactionQueryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { id: "root", parent_id: null },
          { id: "branch", parent_id: "root" },
          { id: "leaf", parent_id: "branch" },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: { id: "leaf", action: "jump" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(withTransactionMock).toHaveBeenCalledTimes(1);
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SET is_active = false"),
      ["story-7"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SELECT id, parent_id FROM story_nodes"),
      ["story-7"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET is_active = true"),
      ["story-7", ["leaf", "branch", "root"]]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("deletes a subtree in a transaction and returns the fallback parent id", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-8" });
    queryOneMock.mockResolvedValue({ story_id: "story-8", parent_id: "parent-8" });
    transactionQueryMock
      .mockResolvedValueOnce({
        rows: [
          { id: "root-8", parent_id: null },
          { id: "parent-8", parent_id: "root-8" },
          { id: "node-8", parent_id: "parent-8" },
          { id: "child-8", parent_id: "node-8" },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { id: "root-8", parent_id: null },
          { id: "parent-8", parent_id: "root-8" },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "DELETE",
        query: { id: "node-8", action: "subtree" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(withTransactionMock).toHaveBeenCalledTimes(1);
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("DELETE FROM story_nodes"),
      ["story-8", ["node-8", "child-8"]]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("SET is_active = true"),
      ["story-8", ["parent-8", "root-8"]]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, parentId: "parent-8" });
  });

  it("splits a node in a transaction and returns the inserted child node", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-9" });
    queryOneMock.mockResolvedValue({ id: "node-9" });
    transactionQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "node-9",
            story_id: "story-9",
            text: "Para one\n\nPara two",
            summary: "Summary",
            story_state: { beat: 1 },
            choices: [{ label: "Go" }],
            is_active: true,
            created_at: "2026-03-28T10:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "node-9b",
            parent_id: "node-9",
            text: "Para two",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: "child-9" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: { id: "node-9", action: "split" },
        headers: { authorization: "Bearer token" },
        body: { position: 1 },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(withTransactionMock).toHaveBeenCalledTimes(1);
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE story_nodes SET text = $1"),
      ["Para one", "node-9"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO story_nodes"),
      [
        "story-9",
        "node-9",
        "Para two",
        "Summary",
        JSON.stringify({ beat: 1 }),
        JSON.stringify([{ label: "Go" }]),
        true,
        "2026-03-28T10:00:00.001Z",
      ]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("SET parent_id = $1"),
      ["node-9b", "node-9"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("SET choices = '[]'::jsonb, summary = NULL"),
      ["node-9"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: "node-9b",
      parent_id: "node-9",
      text: "Para two",
    });
  });

  it("returns 400 when a split position is outside the valid paragraph range", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-9b" });
    queryOneMock.mockResolvedValue({ id: "node-9b" });
    transactionQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "node-9b",
          story_id: "story-9b",
          text: "Only one paragraph",
          summary: "Summary",
          story_state: { beat: 1 },
          choices: [{ label: "Go" }],
          is_active: true,
        },
      ],
    });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: { id: "node-9b", action: "split" },
        headers: { authorization: "Bearer token" },
        body: { position: 1 },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid split position" });
  });

  it("merges a node into its parent in a transaction and returns the parent id", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-10" });
    queryOneMock.mockResolvedValue({ id: "node-10" });
    transactionQueryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "node-10",
            parent_id: "parent-10",
            text: "Child text",
            summary: "Child summary",
            story_state: { beat: 2 },
            choices: [{ label: "Forward" }],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "parent-10",
            text: "Parent text",
            summary: "Parent summary",
            story_state: { beat: 1 },
            choices: [{ label: "Back" }],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "grandchild-10" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: { id: "node-10", action: "merge" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(withTransactionMock).toHaveBeenCalledTimes(1);
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET text = $1, summary = $2, story_state = $3, choices = $4"),
      [
        "Parent text\n\nChild text",
        "Child summary",
        JSON.stringify({ beat: 2 }),
        JSON.stringify([{ label: "Forward" }]),
        "parent-10",
      ]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("SET parent_id = $1"),
      ["parent-10", "node-10"]
    );
    expect(transactionQueryMock).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("DELETE FROM story_nodes"),
      ["node-10"]
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, parentId: "parent-10" });
  });

  it("returns a generic 500 when listing nodes fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-11" });
    queryOneMock.mockResolvedValue({ id: "story-11" });
    queryMock.mockRejectedValue(new Error("db blew up"));
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "GET",
        query: { story_id: "story-11" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });

  it("returns a generic 500 when a node transaction fails", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-12" });
    queryOneMock.mockResolvedValue({ id: "node-12", story_id: "story-12", parent_id: null });
    withTransactionMock.mockRejectedValue(new Error("transaction blew up"));
    const handler = (await import("../../api/db/nodes")).default;
    const res = createResponse();

    await handler(
      {
        method: "POST",
        query: { id: "node-12", action: "jump" },
        headers: { authorization: "Bearer token" },
      } as unknown as VercelRequest,
      res as unknown as VercelResponse
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});

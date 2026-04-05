import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const queryMock = vi.fn();
const queryOneMock = vi.fn();
const withTransactionMock = vi.fn();

vi.mock("../../api/_lib/auth.js", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
}));

vi.mock("../../api/_db.js", () => ({
  query: queryMock,
  queryOne: queryOneMock,
  withTransaction: withTransactionMock,
}));

function createReqRes(method: string, queryParams: Record<string, string> = {}, body?: any) {
  const req = {
    method,
    headers: { authorization: "Bearer tok" },
    query: queryParams,
    body: body ?? {},
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    end() { return this; },
  };
  return { req, res };
}

describe("db/branches route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    getAuthenticatedUserMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("GET", { story_id: "s1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  // --- GET (list) ---
  it("lists branches for a story", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "s1" });
    queryMock.mockResolvedValue([{ id: "b1", is_main: true }]);
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("GET", { story_id: "s1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "b1", is_main: true }]);
  });

  it("returns 400 for GET without story_id", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("GET", {});
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when story not found for GET", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("GET", { story_id: "s1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(404);
  });

  // --- POST create ---
  it("creates a new branch", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock
      .mockResolvedValueOnce({ id: "s1" }) // verify story
      .mockResolvedValueOnce({ id: "n1" }) // verify fork node
      .mockResolvedValueOnce({ id: "b-new", is_main: false }); // insert
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "create" }, {
      story_id: "s1",
      fork_node_id: "n1",
      name: "My Branch",
    });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(201);
  });

  it("returns 400 for create without required fields", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "create" }, {});
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for unknown POST action", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "unknown" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  // --- POST promote ---
  it("returns 400 for promote without id", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "promote" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for promote on non-existent branch", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue(null);
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "promote", id: "b1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(404);
  });

  it("returns 400 when promoting an already-main branch", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "b1", story_id: "s1", is_main: true, tip_node_id: "n1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "promote", id: "b1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Branch is already main" });
  });

  it("returns 400 when promoting a branch with no tip", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "b1", story_id: "s1", is_main: false, tip_node_id: null });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "promote", id: "b1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it("promotes a branch successfully", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "b2", story_id: "s1", is_main: false, tip_node_id: "n3" });
    const clientMock = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: "n3", parent_id: "n2" }, { id: "n2", parent_id: null }] }),
    };
    withTransactionMock.mockImplementation(async (fn: any) => fn(clientMock));
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("POST", { action: "promote", id: "b2" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  // --- PATCH ---
  it("updates branch name", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "b1", name: "New Name" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("PATCH", { id: "b1" }, { name: "New Name" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
  });

  it("returns 400 when name is not a string for PATCH", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("PATCH", { id: "b1" }, { name: 123 });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  // --- DELETE ---
  it("deletes a non-main branch", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "b2", story_id: "s1", is_main: false, tip_node_id: "n1" });
    const clientMock = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    withTransactionMock.mockImplementation(async (fn: any) => fn(clientMock));
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("DELETE", { id: "b2" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 400 when trying to delete the main branch", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    queryOneMock.mockResolvedValue({ id: "b1", story_id: "s1", is_main: true, tip_node_id: "n1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("DELETE", { id: "b1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  // --- Method not allowed ---
  it("returns 405 for unsupported methods with id", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("PUT", { id: "b1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("returns 405 for unsupported methods without id", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("PUT");
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(405);
  });

  it("returns 500 on unexpected errors", async () => {
    getAuthenticatedUserMock.mockRejectedValue(new Error("boom"));
    const handler = (await import("../../api/db/branches")).default;
    const { req, res } = createReqRes("GET", { story_id: "s1" });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(500);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

vi.mock("../../api/_db", () => ({
  query: vi.fn(),
}));

import handler from "../../api/contact";
import { query } from "../../api/_db";

const queryMock = vi.mocked(query);

function mockReq(overrides: Record<string, unknown> = {}) {
  return { method: "POST", body: {}, ...overrides } as unknown as VercelRequest;
}

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  };
  return res as typeof res & VercelResponse;
}

describe("contact API", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("rejects non-POST requests", async () => {
    const res = mockRes();
    await handler(mockReq({ method: "GET" }), res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("rejects missing required fields", async () => {
    const res = mockRes();
    await handler(mockReq({ body: { name: "Jane" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects fields exceeding length limits", async () => {
    const res = mockRes();
    await handler(mockReq({ body: { name: "J".repeat(201), email: "j@t.com", message: "Hi" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects invalid email format", async () => {
    const res = mockRes();
    await handler(mockReq({ body: { name: "Jane", email: "not-an-email", message: "Hi" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles OPTIONS preflight", async () => {
    const res = mockRes();
    await handler(mockReq({ method: "OPTIONS" }), res);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it("rejects invalid field types", async () => {
    const res = mockRes();
    await handler(mockReq({ body: { name: 123, email: "j@t.com", message: "Hi" } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid field types" });
  });

  it("returns 500 on database error", async () => {
    queryMock.mockRejectedValueOnce(new Error("db error"));
    const res = mockRes();
    await handler(mockReq({ body: { name: "Jane", email: "jane@test.com", message: "Hello!" } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("inserts valid submission and returns 200", async () => {
    queryMock.mockResolvedValueOnce([]);
    const res = mockRes();
    await handler(mockReq({ body: { name: "Jane", email: "jane@test.com", message: "Hello!" } }), res);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO contact_messages"),
      ["Jane", "jane@test.com", "Hello!"]
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

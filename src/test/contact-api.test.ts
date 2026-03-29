import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../api/_db", () => ({
  query: vi.fn(),
}));

import handler from "../../api/contact";
import { query } from "../../api/_db";

const queryMock = vi.mocked(query);

function mockReq(overrides: any = {}) {
  return { method: "POST", body: {}, ...overrides } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
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

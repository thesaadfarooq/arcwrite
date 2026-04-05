import { describe, expect, it, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockRelease = vi.fn();

vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    connect: mockConnect,
  })),
}));

describe("_db module", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgres://localhost/test";
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  it("query returns rows", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "1" }, { id: "2" }] });
    const { query } = await import("../../api/_db");
    const result = await query("SELECT * FROM stories");
    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("queryOne returns first row", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "1" }] });
    const { queryOne } = await import("../../api/_db");
    const result = await queryOne("SELECT * FROM stories WHERE id = $1", ["1"]);
    expect(result).toEqual({ id: "1" });
  });

  it("queryOne returns null when no rows", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { queryOne } = await import("../../api/_db");
    const result = await queryOne("SELECT * FROM stories WHERE id = $1", ["missing"]);
    expect(result).toBeNull();
  });

  it("queryCount returns count from query", async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: "42" }] });
    const { queryCount } = await import("../../api/_db");
    const result = await queryCount("SELECT count(*) FROM stories");
    expect(result).toBe(42);
  });

  it("queryCount returns 0 when no count", async () => {
    mockQuery.mockResolvedValue({ rows: [{}] });
    const { queryCount } = await import("../../api/_db");
    const result = await queryCount("SELECT count(*) FROM stories");
    expect(result).toBe(0);
  });

  it("withTransaction commits on success", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { withTransaction } = await import("../../api/_db");
    const result = await withTransaction(async (client) => {
      await client.query("INSERT INTO stories VALUES ($1)", ["test"]);
      return "done";
    });
    expect(result).toBe("done");
    expect(mockQuery).toHaveBeenCalledWith("BEGIN");
    expect(mockQuery).toHaveBeenCalledWith("COMMIT");
    expect(mockRelease).toHaveBeenCalled();
  });

  it("withTransaction rolls back on error", async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql === "INSERT") throw new Error("fail");
      return { rows: [] };
    });
    const { withTransaction } = await import("../../api/_db");
    await expect(
      withTransaction(async (client) => {
        await client.query("INSERT");
      })
    ).rejects.toThrow("fail");
    expect(mockQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(mockRelease).toHaveBeenCalled();
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach, vi } from "vitest";

const poolFactory = vi.fn();
const queryOneMock = vi.fn();

vi.mock("pg", () => ({
  Pool: poolFactory,
}));

describe("DigitalOcean Postgres migration foundation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("../../api/_db");
    process.env.DATABASE_URL = "postgresql://arcwrite_app:secret@127.0.0.1:5432/arcwrite?sslmode=require";
  });

  it("defines the required database schema", () => {
    const schema = readFileSync(join(process.cwd(), "scripts/schema.sql"), "utf8");

    expect(schema).toContain("CREATE TABLE profiles");
    expect(schema).toContain("CREATE TABLE stories");
    expect(schema).toContain("CREATE TABLE story_nodes");
    expect(schema).toContain("CREATE INDEX idx_stories_user_id ON stories(user_id);");
    expect(schema).toContain("CREATE INDEX idx_story_nodes_story_id ON story_nodes(story_id);");
    expect(schema).toContain("CREATE TRIGGER stories_updated_at");
    expect(schema).toContain("CREATE TRIGGER profiles_updated_at");
  });

  it("ships a droplet setup script with SSL and firewall configuration", () => {
    const script = readFileSync(join(process.cwd(), "scripts/setup-droplet.sh"), "utf8");

    expect(script).toContain("apt-get install -y -qq postgresql-${PG_VERSION} postgresql-client-${PG_VERSION} ufw");
    expect(script).toContain("ufw allow 22/tcp");
    expect(script).toContain("ufw allow 5432/tcp");
    expect(script).toContain("openssl req -new -x509 -days 3650 -nodes");
    expect(script).toContain("hostssl all ${DB_USER} 0.0.0.0/0 scram-sha-256");
    expect(script).toContain("sslmode=require");
  });

  it("creates a singleton pg pool with the expected connection settings", async () => {
    poolFactory.mockReturnValue({
      query: vi.fn(),
      connect: vi.fn(),
    });

    const db = await import("../../api/_db");

    const firstPool = db.getPool();
    const secondPool = db.getPool();

    expect(firstPool).toBe(secondPool);
    expect(poolFactory).toHaveBeenCalledTimes(1);
    expect(poolFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        ssl: { rejectUnauthorized: true },
      })
    );
  });

  it("wraps multi-step operations in a committed transaction", async () => {
    const client = {
      query: vi.fn(),
      release: vi.fn(),
    };
    poolFactory.mockReturnValue({
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(client),
    });

    const db = await import("../../api/_db");

    const result = await db.withTransaction(async (txClient) => {
      await txClient.query("SELECT 1");
      return "ok";
    });

    expect(result).toBe("ok");
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "SELECT 1");
    expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back failed transactions before releasing the client", async () => {
    const client = {
      query: vi.fn(),
      release: vi.fn(),
    };
    poolFactory.mockReturnValue({
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(client),
    });

    const db = await import("../../api/_db");

    await expect(
      db.withTransaction(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it("upserts a profile row for the authenticated user", async () => {
    vi.doMock("../../api/_db", () => ({
      queryOne: queryOneMock,
    }));

    const { ensureProfile } = await import("../../api/_auth");

    await expect(ensureProfile("user-123")).resolves.toBe("user-123");

    expect(queryOneMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO profiles (user_id) VALUES ($1)"),
      ["user-123"]
    );
    expect(queryOneMock.mock.calls[0][0]).toContain("ON CONFLICT (user_id) DO NOTHING");
  });
});

import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // Neon serves publicly-trusted certs; verify them (the old droplet was self-signed).
      ssl: { rejectUnauthorized: true },
    });
  }

  return pool;
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const { rows } = await getPool().query(text, params);
  return rows as T[];
}

export async function queryOne<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function queryCount(
  text: string,
  params?: unknown[]
): Promise<number> {
  const { rows } = await getPool().query(text, params);
  return Number.parseInt(rows[0]?.count ?? "0", 10);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

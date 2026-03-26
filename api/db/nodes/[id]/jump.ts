import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../../../_auth";
import { queryOne, withTransaction } from "../../../_db";
import { getAuthenticatedUser } from "../../../_lib/auth";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid id" });
    }

    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await ensureProfile(user.id);

    const node = await queryOne<{ story_id: string }>(
      `SELECT sn.story_id FROM story_nodes sn
       JOIN stories s ON s.id = sn.story_id
       WHERE sn.id = $1 AND s.user_id = $2`,
      [id, user.id]
    );

    if (!node) return res.status(404).json({ error: "Not found" });

    await withTransaction(async (client) => {
      await client.query(
        "UPDATE story_nodes SET is_active = false WHERE story_id = $1 AND is_active = true",
        [node.story_id]
      );

      const { rows } = await client.query<{ id: string; parent_id: string | null }>(
        "SELECT id, parent_id FROM story_nodes WHERE story_id = $1",
        [node.story_id]
      );

      const parentMap = new Map(rows.map((row) => [row.id, row.parent_id]));
      const pathIds: string[] = [];
      let current: string | null = id;

      while (current) {
        pathIds.push(current);
        current = parentMap.get(current) ?? null;
      }

      if (pathIds.length > 0) {
        await client.query(
          "UPDATE story_nodes SET is_active = true WHERE story_id = $1 AND id = ANY($2)",
          [node.story_id, pathIds]
        );
      }
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

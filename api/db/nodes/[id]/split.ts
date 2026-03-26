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

    const { position } = req.body ?? {};
    if (typeof position !== "number") {
      return res.status(400).json({ error: "position required" });
    }

    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await ensureProfile(user.id);

    const ownedNode = await queryOne(
      `SELECT sn.id FROM story_nodes sn
       JOIN stories s ON s.id = sn.story_id
       WHERE sn.id = $1 AND s.user_id = $2`,
      [id, user.id]
    );

    if (!ownedNode) return res.status(404).json({ error: "Not found" });

    const newNode = await withTransaction(async (client) => {
      const { rows } = await client.query<{
        id: string;
        story_id: string;
        text: string;
        summary: string | null;
        story_state: unknown;
        choices: unknown;
        is_active: boolean;
      }>("SELECT * FROM story_nodes WHERE id = $1", [id]);
      const node = rows[0];

      if (!node) {
        throw new Error("Node not found");
      }

      const paragraphs = (node.text || "").split("\n\n").filter(Boolean);
      if (position <= 0 || position >= paragraphs.length) {
        throw new Error("Invalid split position");
      }

      const textBefore = paragraphs.slice(0, position).join("\n\n");
      const textAfter = paragraphs.slice(position).join("\n\n");

      await client.query("UPDATE story_nodes SET text = $1 WHERE id = $2", [textBefore, id]);

      const inserted = await client.query(
        `INSERT INTO story_nodes (
           story_id,
           parent_id,
           text,
           summary,
           story_state,
           choices,
           chosen_option,
           starts_chapter,
           is_active
         )
         VALUES ($1, $2, $3, $4, $5, $6, NULL, true, $7)
         RETURNING *`,
        [
          node.story_id,
          id,
          textAfter,
          node.summary,
          JSON.stringify(node.story_state ?? null),
          JSON.stringify(node.choices ?? null),
          node.is_active,
        ]
      );
      const createdNode = inserted.rows[0];

      const existingChildren = await client.query(
        "SELECT id FROM story_nodes WHERE parent_id = $1 AND id != $2",
        [id, createdNode.id]
      );

      if (existingChildren.rows.length > 0) {
        await client.query(
          "UPDATE story_nodes SET parent_id = $1 WHERE parent_id = $2 AND id != $1",
          [createdNode.id, id]
        );
      }

      await client.query(
        "UPDATE story_nodes SET choices = '[]'::jsonb, summary = NULL WHERE id = $1",
        [id]
      );

      return createdNode;
    });

    if (!newNode) {
      return res.status(400).json({ error: "Invalid split position" });
    }

    return res.json(newNode);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

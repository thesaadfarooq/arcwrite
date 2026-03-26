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

    const ownedNode = await queryOne(
      `SELECT sn.id FROM story_nodes sn
       JOIN stories s ON s.id = sn.story_id
       WHERE sn.id = $1 AND s.user_id = $2`,
      [id, user.id]
    );

    if (!ownedNode) return res.status(404).json({ error: "Not found" });

    const result = await withTransaction(async (client) => {
      const nodeResult = await client.query<{
        id: string;
        parent_id: string | null;
        text: string;
        summary: string | null;
        story_state: unknown;
        choices: unknown;
      }>("SELECT * FROM story_nodes WHERE id = $1", [id]);
      const node = nodeResult.rows[0];

      if (!node?.parent_id) {
        return null;
      }

      const parentResult = await client.query<{
        id: string;
        text: string;
        summary: string | null;
        story_state: unknown;
        choices: unknown;
      }>("SELECT * FROM story_nodes WHERE id = $1", [node.parent_id]);
      const parent = parentResult.rows[0];

      if (!parent) {
        throw new Error("Parent not found");
      }

      await client.query(
        `UPDATE story_nodes
         SET text = $1, summary = $2, story_state = $3, choices = $4
         WHERE id = $5`,
        [
          [parent.text, node.text].filter(Boolean).join("\n\n"),
          node.summary || parent.summary,
          JSON.stringify(node.story_state || parent.story_state || null),
          JSON.stringify(node.choices || parent.choices || null),
          parent.id,
        ]
      );

      const grandchildren = await client.query(
        "SELECT id FROM story_nodes WHERE parent_id = $1",
        [id]
      );

      if (grandchildren.rows.length > 0) {
        await client.query(
          "UPDATE story_nodes SET parent_id = $1 WHERE parent_id = $2",
          [parent.id, id]
        );
      }

      await client.query("DELETE FROM story_nodes WHERE id = $1", [id]);

      return {
        success: true,
        parentId: parent.id,
      };
    });

    if (!result) {
      return res.status(400).json({ error: "Cannot merge root node" });
    }

    return res.json(result);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

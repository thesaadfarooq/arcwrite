import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../_auth";
import { query, queryOne } from "../_db";
import { getAuthenticatedUser } from "../_lib/auth";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await ensureProfile(user.id);

    if (req.method === "GET") {
      const { story_id, active } = req.query;
      if (typeof story_id !== "string") {
        return res.status(400).json({ error: "story_id required" });
      }

      const story = await queryOne(
        "SELECT id FROM stories WHERE id = $1 AND user_id = $2",
        [story_id, user.id]
      );

      if (!story) return res.status(404).json({ error: "Not found" });

      let sql = "SELECT * FROM story_nodes WHERE story_id = $1";
      if (active !== "all") {
        sql += " AND is_active = true";
      }
      sql += " ORDER BY created_at ASC";

      const nodes = await query(sql, [story_id]);
      return res.json(nodes);
    }

    if (req.method === "POST") {
      const {
        story_id,
        parent_id,
        text,
        summary,
        story_state,
        choices,
        chosen_option,
        starts_chapter,
      } = req.body ?? {};

      if (typeof story_id !== "string") {
        return res.status(400).json({ error: "story_id required" });
      }

      const story = await queryOne(
        "SELECT id FROM stories WHERE id = $1 AND user_id = $2",
        [story_id, user.id]
      );

      if (!story) return res.status(404).json({ error: "Not found" });

      const isRoot = !parent_id;
      const node = await queryOne(
        `INSERT INTO story_nodes (
           story_id,
           parent_id,
           text,
           summary,
           story_state,
           choices,
           chosen_option,
           starts_chapter
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          story_id,
          parent_id || null,
          typeof text === "string" ? text : "",
          summary || null,
          JSON.stringify(story_state ?? {}),
          JSON.stringify(choices ?? []),
          chosen_option == null ? null : JSON.stringify(chosen_option),
          starts_chapter ?? isRoot,
        ]
      );

      return res.status(201).json(node);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

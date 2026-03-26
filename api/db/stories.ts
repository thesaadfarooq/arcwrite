import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../_auth.js";
import { query, queryOne, queryCount } from "../_db.js";
import { getAuthenticatedUser } from "../_lib/auth.js";

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

    const id = typeof req.query.id === "string" ? req.query.id : null;

    if (req.method === "GET") {
      // GET /api/db/stories?count=true → story count
      if (req.query.count === "true") {
        const count = await queryCount(
          "SELECT COUNT(*) FROM stories WHERE user_id = $1",
          [user.id]
        );
        return res.json({ count });
      }

      // GET /api/db/stories?id=xxx → single story
      if (id) {
        const story = await queryOne(
          "SELECT * FROM stories WHERE id = $1 AND user_id = $2",
          [id, user.id]
        );
        if (!story) return res.status(404).json({ error: "Not found" });
        return res.json(story);
      }

      // GET /api/db/stories → list all
      const stories = await query(
        "SELECT * FROM stories WHERE user_id = $1 ORDER BY updated_at DESC",
        [user.id]
      );
      return res.json(stories);
    }

    if (req.method === "POST") {
      const { title, genre, tone, premise, status } = req.body ?? {};
      const story = await queryOne(
        `INSERT INTO stories (user_id, title, genre, tone, premise, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          user.id,
          title || "Untitled Story",
          genre || null,
          tone || null,
          premise || null,
          status || "in_progress",
        ]
      );
      return res.status(201).json(story);
    }

    if (req.method === "PATCH") {
      if (!id) return res.status(400).json({ error: "id required" });

      const allowedFields = ["title", "genre", "tone", "premise", "status", "share_token"] as const;
      const sets: string[] = [];
      const values: unknown[] = [];
      let index = 1;

      for (const field of allowedFields) {
        if (req.body?.[field] !== undefined) {
          sets.push(`${field} = $${index}`);
          values.push(req.body[field]);
          index += 1;
        }
      }

      if (sets.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      values.push(id, user.id);
      const story = await queryOne(
        `UPDATE stories SET ${sets.join(", ")}
         WHERE id = $${index} AND user_id = $${index + 1}
         RETURNING *`,
        values
      );

      if (!story) return res.status(404).json({ error: "Not found" });
      return res.json(story);
    }

    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id required" });

      const deleted = await query(
        "DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING id",
        [id, user.id]
      );

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[api/db/stories]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

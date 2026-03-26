import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../../_auth";
import { query, queryOne } from "../../_db";
import { getAuthenticatedUser } from "../../_lib/auth";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "Invalid id" });
    }

    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    await ensureProfile(user.id);

    if (req.method === "GET") {
      const story = await queryOne(
        "SELECT * FROM stories WHERE id = $1 AND user_id = $2",
        [id, user.id]
      );

      if (!story) return res.status(404).json({ error: "Not found" });
      return res.json(story);
    }

    if (req.method === "PATCH") {
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
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

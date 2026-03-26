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
    if (req.method === "GET") {
      const user = await getAuthenticatedUser(getAuthorizationHeader(req));
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      await ensureProfile(user.id);
      const stories = await query(
        "SELECT * FROM stories WHERE user_id = $1 ORDER BY updated_at DESC",
        [user.id]
      );

      return res.json(stories);
    }

    if (req.method === "POST") {
      const user = await getAuthenticatedUser(getAuthorizationHeader(req));
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      await ensureProfile(user.id);

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

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[api/db/stories]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

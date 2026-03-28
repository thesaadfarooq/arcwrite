import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query, queryOne } from "../../_db.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

type SharedStoryRow = {
  id: string;
  title: string;
  genre: string | null;
  premise: string | null;
};

type SharedNodeRow = {
  id: string;
  text: string | null;
  created_at: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { token } = req.query;
    if (typeof token !== "string") {
      return res.status(400).json({ error: "Invalid token" });
    }

    const story = await queryOne<SharedStoryRow>(
      "SELECT id, title, genre, premise FROM stories WHERE share_token = $1",
      [token]
    );

    if (!story) {
      return res.status(404).json({ error: "Not found" });
    }

    const nodes = await query<SharedNodeRow>(
      "SELECT * FROM story_nodes WHERE story_id = $1 AND is_active = true ORDER BY created_at ASC",
      [story.id]
    );

    return res.json({ story, nodes });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

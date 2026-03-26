import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../../../_auth";
import { queryOne } from "../../../_db";
import { getAuthenticatedUser } from "../../../_lib/auth";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "PATCH") {
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

    const allowedFields = [
      "text",
      "summary",
      "choices",
      "story_state",
      "is_active",
      "chosen_option",
      "starts_chapter",
      "chapter_title",
      "parent_id",
    ] as const;

    const sets: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        const isJsonField =
          field === "choices" ||
          field === "story_state" ||
          field === "chosen_option";

        sets.push(`${field} = $${index}`);
        values.push(
          isJsonField && req.body[field] !== null
            ? JSON.stringify(req.body[field])
            : req.body[field]
        );
        index += 1;
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id, user.id);
    const node = await queryOne(
      `UPDATE story_nodes sn SET ${sets.join(", ")}
       FROM stories s
       WHERE sn.id = $${index} AND sn.story_id = s.id AND s.user_id = $${index + 1}
       RETURNING sn.*`,
      values
    );

    if (!node) return res.status(404).json({ error: "Not found" });
    return res.json(node);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

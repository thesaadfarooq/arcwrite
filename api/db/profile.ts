import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureProfile } from "../_auth.js";
import { queryOne } from "../_db.js";
import { getAuthenticatedUser } from "../_lib/auth.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureProfile(user.id);

    const profile = await queryOne(
      "SELECT user_id, tier, tier_override FROM profiles WHERE user_id = $1",
      [user.id]
    );

    if (!profile) {
      return res.status(500).json({ error: "Failed to create profile" });
    }

    return res.json(profile);
  } catch (err) {
    console.error("[api/db/profile]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

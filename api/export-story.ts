import type { VercelRequest, VercelResponse } from "@vercel/node";
import type Stripe from "stripe";
import { query, queryOne } from "./_db.js";
import { getAuthenticatedUser, getUserEmail } from "./_lib/auth.js";

interface StoryRow {
  title: string | null;
  genre: string | null;
}

interface StoryNodeRow {
  text: string | null;
  chosen_option: { label: string } | null;
  chapter_title: string | null;
  starts_chapter: boolean | null;
}

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { storyId } = req.body;
    if (!storyId) return res.status(400).json({ error: "storyId is required" });

    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const userEmail = await getUserEmail(user.id);
    if (!userEmail) throw new Error("User email not available");

    // Server-side tier check: export requires Plus or Pro
    const profile = await queryOne<{ tier_override: string | null }>(
      "SELECT tier_override FROM profiles WHERE user_id = $1",
      [user.id]
    );

    const tierOverride = profile?.tier_override;
    if (tierOverride !== "plus" && tierOverride !== "pro") {
      // Check Stripe for actual subscription
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length === 0) {
        return res.status(403).json({ error: "PDF export requires a Plus or Pro plan" });
      }
      const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
      if (subs.data.length === 0) {
        return res.status(403).json({ error: "PDF export requires a Plus or Pro plan" });
      }
    }

    const story = await queryOne<StoryRow>(
      "SELECT * FROM stories WHERE id = $1 AND user_id = $2",
      [storyId, user.id]
    );

    if (!story) return res.status(404).json({ error: "Story not found" });

    const nodes = await query<StoryNodeRow>(
      "SELECT text, chosen_option, chapter_title, starts_chapter FROM story_nodes WHERE story_id = $1 AND is_active = true ORDER BY created_at ASC",
      [storyId]
    );

    const sections = nodes.map((node: StoryNodeRow, i: number) => ({
      title: node.chapter_title || node.chosen_option?.label || (i === 0 ? "Opening" : `Section ${i + 1}`),
      paragraphs: (node.text || "").split("\n\n").filter(Boolean),
      startsChapter: !!node.starts_chapter,
    }));

    const fullText = nodes.map((n: StoryNodeRow) => n.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return res.json({
      title: story.title || "Untitled Story",
      genre: story.genre || null,
      wordCount,
      sections,
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

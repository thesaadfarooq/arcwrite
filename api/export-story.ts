import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const { storyId } = req.body;
    if (!storyId) throw new Error("storyId is required");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.authorization || "";
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } }
    );

    // Server-side tier check: export requires Plus or Pro
    const { data: profile } = await adminClient
      .from("profiles")
      .select("tier_override")
      .eq("user_id", userData.user.id)
      .single();

    const tierOverride = profile?.tier_override;
    if (tierOverride !== "plus" && tierOverride !== "pro") {
      // Check Stripe for actual subscription
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-08-27.basil" as any });
      const customers = await stripe.customers.list({ email: userData.user.email!, limit: 1 });
      if (customers.data.length === 0) {
        return res.status(403).json({ error: "PDF export requires a Plus or Pro plan" });
      }
      const subs = await stripe.subscriptions.list({ customer: customers.data[0].id, status: "active", limit: 1 });
      if (subs.data.length === 0) {
        return res.status(403).json({ error: "PDF export requires a Plus or Pro plan" });
      }
    }

    const { data: story, error: storyErr } = await adminClient
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .eq("user_id", userData.user.id)
      .single();

    if (storyErr || !story) throw new Error("Story not found");

    const { data: nodes, error: nodesErr } = await adminClient
      .from("story_nodes")
      .select("text, chosen_option, chapter_title, starts_chapter")
      .eq("story_id", storyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (nodesErr) throw new Error("Failed to fetch story nodes");

    const sections = (nodes || []).map((node: any, i: number) => ({
      title: node.chapter_title || node.chosen_option?.label || (i === 0 ? "Opening" : `Section ${i + 1}`),
      paragraphs: (node.text || "").split("\n\n").filter(Boolean),
      startsChapter: !!node.starts_chapter,
    }));

    const fullText = (nodes || []).map((n: any) => n.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return res.json({
      title: story.title || "Untitled Story",
      genre: story.genre || null,
      wordCount,
      sections,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: msg });
  }
}

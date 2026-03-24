import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

    const { data: story, error: storyErr } = await adminClient
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .eq("user_id", userData.user.id)
      .single();

    if (storyErr || !story) throw new Error("Story not found");

    const { data: nodes, error: nodesErr } = await adminClient
      .from("story_nodes")
      .select("text, chosen_option")
      .eq("story_id", storyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (nodesErr) throw new Error("Failed to fetch story nodes");

    const title = story.title || "Untitled Story";
    const genre = story.genre || "";
    const fullText = (nodes || []).map((n: any) => n.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    let htmlSections = "";
    (nodes || []).forEach((node: any, i: number) => {
      const chapterTitle = node.chosen_option?.label || (i === 0 ? "Opening" : `Section ${i + 1}`);
      const paragraphs = (node.text || "").split("\n\n").filter(Boolean);

      htmlSections += `
        <div style="margin-bottom: 2em;${i > 0 ? " page-break-before: auto;" : ""}">
          <h2 style="font-family: Georgia, serif; font-size: 18px; color: #333; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px;">
            ${chapterTitle}
          </h2>
          ${paragraphs.map((p: string) => `<p style="font-family: Georgia, serif; font-size: 12px; line-height: 1.8; color: #222; margin-bottom: 1em; text-align: justify;">${escapeHtml(p)}</p>`).join("")}
        </div>
      `;
    });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: Georgia, serif;">
  <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #333;">
    <h1 style="font-size: 28px; color: #111; margin-bottom: 8px;">${escapeHtml(title)}</h1>
    ${genre ? `<p style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 2px;">${escapeHtml(genre)}</p>` : ""}
    <p style="font-size: 12px; color: #999; margin-top: 8px;">${wordCount.toLocaleString()} words</p>
  </div>
  ${htmlSections}
  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="font-size: 11px; color: #999;">Created with Arcwrite</p>
  </div>
</body>
</html>`;

    return res.json({ html, title, wordCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: msg });
  }
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyId } = await req.json();
    if (!storyId) throw new Error("storyId is required");

    // Auth check
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    // Fetch story
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: story, error: storyErr } = await adminClient
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .eq("user_id", userData.user.id)
      .single();

    if (storyErr || !story) throw new Error("Story not found");

    // Fetch active nodes
    const { data: nodes, error: nodesErr } = await adminClient
      .from("story_nodes")
      .select("text, chosen_option")
      .eq("story_id", storyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (nodesErr) throw new Error("Failed to fetch story nodes");

    // Build HTML for PDF conversion
    const title = story.title || "Untitled Story";
    const genre = story.genre || "";
    const fullText = (nodes || []).map((n: any) => n.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Build chapter sections
    let htmlSections = "";
    (nodes || []).forEach((node: any, i: number) => {
      const chapterTitle = node.chosen_option?.label || (i === 0 ? "Opening" : `Section ${i + 1}`);
      const paragraphs = (node.text || "").split("\n\n").filter(Boolean);
      
      htmlSections += `
        <div style="margin-bottom: 2em;${i > 0 ? ' page-break-before: auto;' : ''}">
          <h2 style="font-family: Georgia, serif; font-size: 18px; color: #333; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px;">
            ${chapterTitle}
          </h2>
          ${paragraphs.map((p: string) => `<p style="font-family: Georgia, serif; font-size: 12px; line-height: 1.8; color: #222; margin-bottom: 1em; text-align: justify;">${escapeHtml(p)}</p>`).join("")}
        </div>
      `;
    });

    const html = `
<!DOCTYPE html>
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
    <p style="font-size: 11px; color: #999;">Created with VibeWrite</p>
  </div>
</body>
</html>`;

    return new Response(JSON.stringify({ html, title, wordCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

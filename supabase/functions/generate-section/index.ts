import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, tone, storyState, summary, recentText, direction, premise, genre } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt({ tone, storyState, summary, recentText, premise, genre });

    const userMessage = direction
      ? `Continue the story based on this direction: ${direction}`
      : premise
      ? `Write the opening section (2-3 paragraphs) of a story with this premise: ${premise}`
      : "Continue the story naturally.";

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []),
      { role: "user", content: userMessage },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: allMessages,
        stream: true,
        max_completion_tokens: 1500,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited by OpenAI. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-section error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt({
  tone,
  storyState,
  summary,
  recentText,
  premise,
  genre,
}: {
  tone?: string;
  storyState?: any;
  summary?: string;
  recentText?: string;
  premise?: string;
  genre?: string;
}) {
  let prompt = `You are a master storyteller and prose writer. Write rich, immersive narrative prose.

RULES:
- Write 2-3 paragraphs of polished, publishable prose
- Show, don't tell. Use vivid sensory details
- Maintain consistent characterization and plot continuity
- End at a natural decision point where the reader could choose what happens next
- Do NOT include meta-commentary, options, or questions — just write the story
- Each paragraph should be separated by a blank line`;

  if (tone) prompt += `\n\nTONE: Write in a ${tone} style. Maintain this tone consistently.`;
  if (genre) prompt += `\n\nGENRE: ${genre}`;

  if (storyState && Object.keys(storyState).length > 0) {
    prompt += `\n\nSTORY STATE:\n${JSON.stringify(storyState, null, 2)}`;
  }

  if (summary) prompt += `\n\nSTORY SO FAR (summary):\n${summary}`;
  if (recentText) prompt += `\n\nRECENT TEXT:\n${recentText}`;

  return prompt;
}

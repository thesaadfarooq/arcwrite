import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fullText, previousSummary, storyState } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a story analyst. Your job is to:
1. Summarize the story so far in 2-3 concise paragraphs
2. Extract/update the structured story state

Return your analysis using the provided tool.`;

    const userContent = `${previousSummary ? `Previous summary: ${previousSummary}\n\n` : ""}New text to incorporate:\n${fullText}\n\n${storyState ? `Current story state: ${JSON.stringify(storyState)}` : ""}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "update_story_state",
              description: "Update the rolling summary and structured story state",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 paragraph summary of the entire story so far" },
                  story_state: {
                    type: "object",
                    properties: {
                      characters: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                            role: { type: "string" },
                          },
                          required: ["name"],
                        },
                      },
                      locations: { type: "array", items: { type: "string" } },
                      active_plot_threads: { type: "array", items: { type: "string" } },
                      relationships: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                required: ["summary", "story_state"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "update_story_state" } },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Summarization failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No summary generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

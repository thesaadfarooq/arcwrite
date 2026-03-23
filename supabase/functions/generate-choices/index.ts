import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { recentText, summary, storyState, tone, genre } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a story direction advisor. Given the current state of a story, generate exactly 4 possible directions for what could happen next.

Each direction must be one of these types:
- safe: The expected, natural progression of the narrative
- risky: A surprising plot twist or unexpected turn
- emotional: A character-driven, emotionally resonant direction
- chaotic: A wild, unpredictable turn that shakes up everything

For each direction, provide:
- type: one of safe, risky, emotional, chaotic
- label: a short 4-8 word description
- preview: a 1-2 sentence preview of what would happen

${tone ? `TONE: ${tone}` : ""}
${genre ? `GENRE: ${genre}` : ""}`;

    const userContent = `Current story context:
${summary ? `Summary: ${summary}` : ""}
${recentText ? `Recent text: ${recentText}` : "No text yet."}
${storyState ? `Story state: ${JSON.stringify(storyState)}` : ""}

Generate 4 story direction choices.`;

    console.log("[generate-choices] Calling OpenAI...");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-5.4-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_choices",
              description: "Provide 4 story direction choices",
              parameters: {
                type: "object",
                properties: {
                  choices: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["safe", "risky", "emotional", "chaotic"] },
                        label: { type: "string" },
                        preview: { type: "string" },
                      },
                      required: ["type", "label", "preview"],
                    },
                    minItems: 4,
                    maxItems: 4,
                  },
                },
                required: ["choices"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_choices" } },
        temperature: 0.9,
      }),
    });

    clearTimeout(timeout);
    console.log("[generate-choices] OpenAI responded:", response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate choices" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No choices generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const choices = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(choices), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isAbort = e instanceof DOMException && e.name === "AbortError";
    console.error("generate-choices error:", isAbort ? "Request timed out after 25s" : msg);
    return new Response(JSON.stringify({ error: isAbort ? "Request timed out — please retry" : msg }), {
      status: isAbort ? 504 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

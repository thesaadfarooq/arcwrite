import { getAuthenticatedUser, getUserTier, unauthorizedResponse } from "./_lib/auth.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const { fullText, previousSummary, storyState } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const tier = await getUserTier(user.id);
    const model = tier === "free" ? "gpt-5.4-nano" : "gpt-5.4-mini";

    const systemPrompt = `You are a story analyst. Your job is to:
1. Summarize the story so far in 2-3 concise paragraphs
2. Extract/update the structured story state

Return your analysis using the provided tool.`;

    const userContent = `${previousSummary ? `Previous summary: ${previousSummary}\n\n` : ""}New text to incorporate:\n${fullText}\n\n${storyState ? `Current story state: ${JSON.stringify(storyState)}` : ""}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Summarization failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream tool call chunks, assemble, return final JSON
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let argsBuffer = "";
    let leftover = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = leftover + decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      leftover = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ") || trimmed.includes("[DONE]")) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.tool_calls?.[0]?.function?.arguments) {
            argsBuffer += delta.tool_calls[0].function.arguments;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    const result = JSON.parse(argsBuffer);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("summarize error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

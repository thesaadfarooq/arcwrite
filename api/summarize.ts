import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "./_lib/auth.js";
import { getUserTier } from "./_lib/tier.js";

export const config = { runtime: "nodejs", maxDuration: 120 };

function getAuthHeader(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  return typeof h === "string" ? h : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const user = await getAuthenticatedUser(getAuthHeader(req));
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { fullText, previousSummary, storyState } = req.body;

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
      return res.status(500).json({ error: "Summarization failed" });
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
    return res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("summarize error:", msg);
    return res.status(500).json({ error: msg });
  }
}

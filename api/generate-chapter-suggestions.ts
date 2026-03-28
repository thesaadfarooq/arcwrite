import { getAuthenticatedUser, unauthorizedResponse } from "./_lib/auth.js";

export const config = { runtime: "edge" };

type Beat = {
  phase?: string;
  progress?: number;
  phaseProgress?: number;
  turnsRemaining?: number;
  isNearEnd?: boolean;
  isFinalSection?: boolean;
};

type ReviewNode = {
  id: string;
  text: string;
  startsChapter: boolean;
  chapterTitle: string | null;
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const { premise, tone, genre, summary, beat, recentNodes } = (await req.json()) as {
      premise?: string;
      tone?: string;
      genre?: string;
      summary?: string;
      beat?: Beat;
      recentNodes?: ReviewNode[];
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a structural fiction editor. Review only the recent active branch tail.

Return at most 2 suggestions. Allowed suggestion types:
- start_new_chapter_here
- rename_recent_chapter

Only suggest a new chapter when there is a genuine scene, location, time, or objective shift.
Do not suggest changes to inactive branches or old, settled chapters.
Each suggestion must include anchorNodeId, anchorParagraphIndex (or null for rename), proposedTitle (or null), and a short reason.

${premise ? `Premise: ${premise}` : ""}
${tone ? `Tone: ${tone}` : ""}
${genre ? `Genre: ${genre}` : ""}
${summary ? `Summary: ${summary}` : ""}
${beat?.phase ? `Current phase: ${beat.phase}` : ""}`;

    const userContent = `Recent active-branch nodes:
${JSON.stringify(recentNodes ?? [], null, 2)}

Return only high-confidence chapter guidance.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
              name: "provide_chapter_suggestions",
              description: "Return at most two chapter review suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    minItems: 0,
                    maxItems: 2,
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["start_new_chapter_here", "rename_recent_chapter"],
                        },
                        anchorNodeId: { type: "string" },
                        anchorParagraphIndex: { type: ["number", "null"] },
                        proposedTitle: { type: ["string", "null"] },
                        reason: { type: "string" },
                      },
                      required: ["type", "anchorNodeId", "anchorParagraphIndex", "proposedTitle", "reason"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_chapter_suggestions" } },
        temperature: 0.4,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate chapter suggestions" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    return new Response(JSON.stringify(JSON.parse(argsBuffer || "{\"suggestions\":[]}")), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-chapter-suggestions error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

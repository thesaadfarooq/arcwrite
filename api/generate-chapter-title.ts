import { getAuthenticatedUser, unauthorizedResponse } from "./_lib/auth.js";

export const config = { runtime: "nodejs", maxDuration: 60 };

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
  paragraphCount?: number;
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const { premise, tone, genre, summary, beat, recentNodes, currentTitle } = (await req.json()) as {
      premise?: string;
      tone?: string;
      genre?: string;
      summary?: string;
      beat?: Beat;
      recentNodes?: ReviewNode[];
      currentTitle?: string;
    };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a fiction editor naming the current chapter of a branching story.

Return exactly one chapter title.
The title should feel specific, evocative, and grounded in the recent chapter material.
Avoid generic labels like "A New Beginning" unless the story truly earns them.
Do not explain the title or return multiple options.

${premise ? `Premise: ${premise}` : ""}
${tone ? `Tone: ${tone}` : ""}
${genre ? `Genre: ${genre}` : ""}
${summary ? `Summary: ${summary}` : ""}
${beat?.phase ? `Current phase: ${beat.phase}` : ""}
${currentTitle ? `Current title (avoid repeating): ${currentTitle}` : ""}`;

    const userContent = `Recent active-branch nodes:
${JSON.stringify(recentNodes ?? [], null, 2)}

Suggest exactly one chapter title for the material above.`;

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
              name: "provide_chapter_title",
              description: "Return exactly one chapter title",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                },
                required: ["title"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_chapter_title" } },
        temperature: 0.6,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate chapter title" }), {
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

    const parsed = JSON.parse(argsBuffer || "{\"title\":\"\"}") as { title?: unknown };
    const title = typeof parsed.title === "string" ? parsed.title : "";

    return new Response(JSON.stringify({ title }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-chapter-title error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

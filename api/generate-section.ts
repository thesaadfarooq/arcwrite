import { getAuthenticatedUser, unauthorizedResponse } from "./_lib/auth.js";

export const config = { runtime: "edge" };

const LENGTH_PRESETS: Record<string, { paragraphs: string; maxTokens: number }> = {
  short:  { paragraphs: "1-2 paragraphs (~100 words)", maxTokens: 500 },
  medium: { paragraphs: "2-3 paragraphs (~250 words)", maxTokens: 1200 },
  long:   { paragraphs: "4-6 paragraphs (~500 words)", maxTokens: 2500 },
  epic:   { paragraphs: "8-10 paragraphs (~1000 words)", maxTokens: 4000 },
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { tone, storyState, summary, recentText, direction, premise, genre, length } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const preset = LENGTH_PRESETS[length] || LENGTH_PRESETS.medium;
    const systemPrompt = buildSystemPrompt({ tone, storyState, summary, recentText, premise, genre, paragraphInstruction: preset.paragraphs });

    const userMessage = direction
      ? `Continue the story based on this direction: ${direction}`
      : premise
      ? `Write the opening section of a story with this premise: ${premise}`
      : "Continue the story naturally.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
        max_completion_tokens: preset.maxTokens,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited by OpenAI. Please wait a moment." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-section error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function buildSystemPrompt({
  tone,
  storyState,
  summary,
  recentText,
  premise,
  genre,
  paragraphInstruction,
}: {
  tone?: string;
  storyState?: any;
  summary?: string;
  recentText?: string;
  premise?: string;
  genre?: string;
  paragraphInstruction: string;
}) {
  let prompt = `You are a master storyteller and prose writer. Write rich, immersive narrative prose.

RULES:
- Write ${paragraphInstruction} of polished, publishable prose
- Show, don't tell. Use vivid sensory details
- Maintain consistent characterization and plot continuity
- End at a natural decision point where the reader could choose what happens next
- Do NOT include meta-commentary, options, or questions — just write the story
- Each paragraph should be separated by a blank line
- When naming characters, be creative and varied. Never default to common AI-generated names like "Mara", "Kael", "Elara", "Lyra", or "Aric". Choose distinctive names that fit the specific genre, setting, and cultural context of the story.`;

  if (premise) prompt += `\n\nORIGINAL PREMISE: ${premise}
Use this premise as the foundation and guiding direction for the story. Follow these rules regarding the premise:
- If the premise names specific characters, use those names and keep them consistent
- If the premise describes characters generically (e.g. "a man", "a warrior"), you may give them fitting names that match the tone and genre, and develop their personality naturally
- You are free to introduce new characters, locations, and plot elements as the story naturally demands — the premise is a starting point, not a cage
- The premise establishes the core concept and direction; honor its spirit while letting the story breathe and evolve organically
- Never contradict established details from the premise or from earlier in the story`;
  if (tone) prompt += `\n\nTONE: Write in a ${tone} style. Maintain this tone consistently.`;
  if (genre) prompt += `\n\nGENRE: ${genre}`;
  if (storyState && Object.keys(storyState).length > 0) {
    prompt += `\n\nSTORY STATE:\n${JSON.stringify(storyState, null, 2)}`;
  }
  if (summary) prompt += `\n\nSTORY SO FAR (summary):\n${summary}`;
  if (recentText) prompt += `\n\nRECENT TEXT:\n${recentText}`;

  return prompt;
}

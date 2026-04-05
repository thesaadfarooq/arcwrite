import { getAuthenticatedUser, getUserTier, unauthorizedResponse } from "./_lib/auth.js";
import { PROSE_CRAFT_RULES } from "./_lib/prose-rules.js";
import { getToneDirective, getNamingGuidance } from "../src/lib/tone-profiles.js";

export const config = { runtime: "edge" };

const LENGTH_PRESETS: Record<string, { paragraphs: string; maxTokens: number }> = {
  brief:  { paragraphs: "1 short paragraph (~50 words)", maxTokens: 250 },
  short:  { paragraphs: "1-2 paragraphs (~100 words)", maxTokens: 500 },
  medium: { paragraphs: "2-3 paragraphs (~250 words)", maxTokens: 1200 },
  long:   { paragraphs: "4-6 paragraphs (~500 words)", maxTokens: 2500 },
  epic:   { paragraphs: "8-10 paragraphs (~1000 words)", maxTokens: 4000 },
};

type NarrativePhase = "setup" | "rising" | "climax" | "falling" | "resolution";
type StoryArcMode = "normal" | "concluding" | "post_ending" | "resumed_extension";
type Beat = {
  phase?: NarrativePhase;
  progress?: number;
  phaseProgress?: number;
  turnsRemaining?: number;
  isNearEnd?: boolean;
  isFinalSection?: boolean;
};

const DEFAULT_PACING = "End at a natural decision point where the reader could choose what happens next.";

function getPacingInstruction(beat?: Beat, arcMode: StoryArcMode = "normal") {
  if (beat?.isFinalSection) {
    return "This is the final section of the story. Write a conclusive, satisfying ending. Resolve the central thread, give the protagonist a final moment, and close with an image or line that resonates. Do not set up further choices - this is the end.";
  }

  const phaseInstruction = (() => {
    switch (beat?.phase) {
      case "setup":
        return "You are in the opening of this story. Establish the world and characters with vivid detail, ground the reader in the setting, and plant the seeds of the central conflict. End this section at a natural pause - not a cliffhanger. Let the reader settle into the world before things start moving.";
      case "rising":
        return "The story is building momentum. Develop complications, deepen character relationships, and raise the stakes. Vary your section endings - sometimes build tension, sometimes end with a quiet character moment or a surprising revelation. Not every section needs a cliffhanger.";
      case "climax":
        return "The story is approaching its peak. Escalate the central conflict toward confrontation or revelation. This is where the biggest, most consequential moments happen. End with impact - this is where cliffhangers and dramatic beats feel earned.";
      case "falling":
        return "The major conflict has peaked. Show the aftermath and consequences, resolve secondary threads, and let characters process what happened. The pace should feel like exhaling - purposeful but no longer frantic.";
      case "resolution":
        return "Bring the story to a satisfying close. Tie up remaining threads, deliver a final emotional beat, and give the reader a sense of completion. This section should feel conclusive. No need to set up what's next - let the story land.";
      default:
        return DEFAULT_PACING;
    }
  })();

  switch (arcMode) {
    case "post_ending":
      return `This is a post-ending continuation. The story has already landed once, so honor that closure and write from its consequences instead of undoing it. Focus on aftermath, loose threads, or the first signs of a new strain beneath the peace. ${phaseInstruction}`;
    case "resumed_extension":
      return `This is a resumed extension. Treat the previous ending as settled history, then launch a fresh arc from that quieter baseline. Build momentum toward a fresh arc, and do not simply restate the previous ending. ${phaseInstruction}`;
    default:
      return phaseInstruction;
  }
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { tone, storyState, summary, recentText, direction, premise, genre, length, arcMode, beat } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const tier = await getUserTier(user.id);
    const model = tier === "free" ? "gpt-5.4-nano" : "gpt-5.4-mini";

    const preset = LENGTH_PRESETS[length] || LENGTH_PRESETS.medium;
    const systemPrompt = buildSystemPrompt({
      tone,
      storyState,
      summary,
      recentText,
      premise,
      genre,
      paragraphInstruction: preset.paragraphs,
      pacingInstruction: getPacingInstruction(beat, arcMode),
    });

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
        model,
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
  pacingInstruction,
}: {
  tone?: string;
  storyState?: any;
  summary?: string;
  recentText?: string;
  premise?: string;
  genre?: string;
  paragraphInstruction: string;
  pacingInstruction: string;
}) {
  let prompt = `You are a master storyteller and prose writer. Write rich, immersive narrative prose with the craft and instincts of a seasoned novelist.

RULES:
- Write ${paragraphInstruction} of polished, publishable prose
- Show, don't tell. Use vivid sensory details
- Maintain consistent characterization and plot continuity
- ${pacingInstruction}
- Do NOT include meta-commentary, options, or questions — just write the story
- Each paragraph should be separated by a blank line
- When naming characters, be creative and varied. Never default to common AI-generated names like "Mara", "Kael", "Elara", "Lyra", or "Aric". Choose distinctive names that fit the specific genre, setting, and cultural context of the story.
${PROSE_CRAFT_RULES}`;

  if (premise) prompt += `\n\nORIGINAL PREMISE: ${premise}
Use this premise as the foundation and guiding direction for the story. Follow these rules regarding the premise:
- If the premise names specific characters, use those names and keep them consistent
- If the premise describes characters generically (e.g. "a man", "a warrior"), you may give them fitting names that match the tone and genre, and develop their personality naturally
- You are free to introduce new characters, locations, and plot elements as the story naturally demands — the premise is a starting point, not a cage
- The premise establishes the core concept and direction; honor its spirit while letting the story breathe and evolve organically
- Never contradict established details from the premise or from earlier in the story`;
  const toneBlock = getToneDirective(tone);
  if (toneBlock) prompt += `\n\n${toneBlock}`;
  if (genre) prompt += `\n\nGENRE: ${genre}`;
  if (genre) prompt += `\n\n${getNamingGuidance(genre)}`;
  if (storyState && Object.keys(storyState).length > 0) {
    prompt += `\n\nSTORY STATE:\n${JSON.stringify(storyState, null, 2)}`;
  }
  if (summary) prompt += `\n\nSTORY SO FAR (summary):\n${summary}`;
  if (recentText) prompt += `\n\nRECENT TEXT:\n${recentText}`;

  return prompt;
}

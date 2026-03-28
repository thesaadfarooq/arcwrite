import { getAuthenticatedUser, unauthorizedResponse } from "./_lib/auth.js";

export const config = { runtime: "edge" };

type NarrativePhase = "setup" | "rising" | "climax" | "falling" | "resolution";
type Beat = {
  phase?: NarrativePhase;
  progress?: number;
  phaseProgress?: number;
  turnsRemaining?: number;
  isNearEnd?: boolean;
  isFinalSection?: boolean;
};

const ALL_CHOICE_TYPES = [
  "safe",
  "risky",
  "emotional",
  "chaotic",
  "explore",
  "connect",
  "foreshadow",
  "complicate",
  "confront",
  "resolve",
  "conclude",
  "epilogue",
] as const;

function getChoiceTypesForPhase(phase?: NarrativePhase) {
  switch (phase) {
    case "setup":
      return ["explore", "connect", "safe", "foreshadow"] as const;
    case "rising":
      return ["safe", "risky", "emotional", "complicate"] as const;
    case "climax":
      return ["confront", "risky", "emotional", "chaotic"] as const;
    case "falling":
      return ["resolve", "emotional", "explore", "conclude"] as const;
    case "resolution":
      return ["resolve", "emotional", "conclude", "epilogue"] as const;
    default:
      return ["explore", "connect", "safe", "foreshadow"] as const;
  }
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const { recentText, summary, storyState, tone, genre, premise, beat } = await req.json() as {
      recentText?: string;
      summary?: string;
      storyState?: unknown;
      tone?: string;
      genre?: string;
      premise?: string;
      beat?: Beat;
    };
    const choiceTypes = getChoiceTypesForPhase(beat?.phase);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a story direction advisor. Given the current state of a story, generate exactly 4 possible directions for what could happen next.

Current phase: ${beat?.phase || "setup"}
Use these 4 types for this phase: ${choiceTypes.join(", ")}.

Each direction type must be one of the supported story types:
- safe: The expected, natural progression of the narrative
- risky: A surprising plot twist or unexpected turn
- emotional: A character-driven, emotionally resonant direction
- chaotic: A wild, unpredictable turn that shakes up everything
- explore: Investigate the world, a mystery, or a character's backstory
- connect: Build or test a relationship, alliance, or bond
- foreshadow: Hint at something deeper beneath the surface
- complicate: Introduce a new obstacle, betrayal, or unexpected twist
- confront: Face the central conflict or antagonist directly
- resolve: Tie up a loose thread or make a decisive choice about an open question
- conclude: Begin wrapping up the entire story toward a final ending
- epilogue: A glimpse into the future after the main events

For each direction, provide:
- type: one of ${choiceTypes.join(", ")}
- label: a short 4-8 word description
- preview: a 1-2 sentence preview of what would happen

${premise ? `ORIGINAL PREMISE: ${premise}\nChoices should be consistent with the premise's core concept and any established characters/settings. However, choices may introduce new characters, locations, or plot developments — the premise is a foundation, not a boundary. Never contradict what has already been established.` : ""}
${tone ? `TONE: ${tone}` : ""}
${genre ? `GENRE: ${genre}` : ""}`;

    const userContent = `Current story context:
${summary ? `Summary: ${summary}` : ""}
${recentText ? `Recent text: ${recentText}` : "No text yet."}
${storyState ? `Story state: ${JSON.stringify(storyState)}` : ""}

Generate 4 story direction choices.`;

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
                        type: { type: "string", enum: [...ALL_CHOICE_TYPES] },
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate choices" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream tool call argument chunks, assemble, return final JSON
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let argsBuffer = "";
    let leftover = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = leftover + decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      // Last element may be a partial line — save it for the next chunk
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
    console.error("generate-choices error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

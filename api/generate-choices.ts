import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "./_lib/auth.js";
import { getToneDirective } from "../src/lib/tone-profiles.js";

export const config = { runtime: "nodejs", maxDuration: 300 };

function getAuthHeader(req: VercelRequest): string | null {
  const h = req.headers.authorization;
  return typeof h === "string" ? h : null;
}

type StoryArcMode = "normal" | "concluding" | "post_ending" | "resumed_extension";
type StoryMoveFamily =
  | "investigate"
  | "connect"
  | "commit"
  | "foreshadow"
  | "reveal"
  | "complicate"
  | "risk"
  | "bargain"
  | "confront"
  | "sacrifice"
  | "regroup"
  | "reflect"
  | "resolve"
  | "conclude"
  | "epilogue"
  | "aftermath"
  | "loose_thread"
  | "new_problem"
  | "time_skip";
type StoryEndingType = "conclude" | "epilogue";
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

const MOVE_FAMILY_GUIDANCE: Record<StoryMoveFamily, string> = {
  investigate: "pursue a clue, mystery, or hidden detail",
  connect: "deepen or test a relationship",
  commit: "force a consequential choice or commitment",
  foreshadow: "hint at a threat, promise, or deeper truth",
  reveal: "uncover information that changes the reader's understanding",
  complicate: "introduce an obstacle, betrayal, or setback",
  risk: "take a bold action with uncertain cost",
  bargain: "negotiate, trade, or compromise under pressure",
  confront: "face the central conflict directly",
  sacrifice: "give something up to gain something vital",
  regroup: "recover, reassess, or gather strength",
  reflect: "linger on emotional or thematic consequences",
  resolve: "tie off an open thread or answer a question",
  conclude: "move toward a final wrap-up",
  epilogue: "show what life looks like after the main events",
  aftermath: "focus on consequences after the apparent ending",
  loose_thread: "surface something unresolved from before",
  new_problem: "introduce a new threat, cost, or instability",
  time_skip: "jump forward and show how things changed",
};

function isStoryMoveFamily(value: unknown): value is StoryMoveFamily {
  return typeof value === "string" && value in MOVE_FAMILY_GUIDANCE;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const user = await getAuthenticatedUser(getAuthHeader(req));
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { recentText, summary, storyState, tone, genre, premise, beat, arcMode, moveFamilies, previousEnding } = req.body as {
      recentText?: string;
      summary?: string;
      storyState?: unknown;
      tone?: string;
      genre?: string;
      premise?: string;
      beat?: Beat;
      arcMode?: StoryArcMode;
      moveFamilies?: unknown[];
      previousEnding?: StoryEndingType | null;
    };
    const currentArcMode = arcMode ?? "normal";
    const choiceTypes = getChoiceTypesForPhase(beat?.phase);
    const selectedMoveFamilies = (moveFamilies ?? []).filter(isStoryMoveFamily).slice(0, 4);
    const allowedChoiceTypes = selectedMoveFamilies.length > 0 ? ALL_CHOICE_TYPES : choiceTypes;
    const moveFamilyInstruction = selectedMoveFamilies.length > 0
      ? `Generate exactly one choice for each required move family.
Required move families:
${selectedMoveFamilies.map((family) => `- ${family}: ${MOVE_FAMILY_GUIDANCE[family]}`).join("\n")}
Choose the story type that best fits each move family while staying within the supported story types.`
      : "";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const systemPrompt = `You are a story direction advisor. Given the current state of a story, generate exactly 4 possible directions for what could happen next.

Current phase: ${beat?.phase || "setup"}
Current arc mode: ${currentArcMode}
${previousEnding ? `Previous ending beat: ${previousEnding}` : ""}
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
- type: one of ${allowedChoiceTypes.join(", ")}
- label: a short 4-8 word description
- preview: a 1-2 sentence preview of what would happen

${moveFamilyInstruction}
${premise ? `ORIGINAL PREMISE: ${premise}\nChoices should be consistent with the premise's core concept and any established characters/settings. However, choices may introduce new characters, locations, or plot developments — the premise is a foundation, not a boundary. Never contradict what has already been established.` : ""}
${getToneDirective(tone) ?? ""}
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
      return res.status(500).json({ error: "Failed to generate choices" });
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
    return res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("generate-choices error:", msg);
    return res.status(500).json({ error: msg });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "./_lib/auth.js";
import { getUserTier } from "./_lib/tier.js";
import { getToneDirective } from "../src/lib/tone-profiles.js";
import { PROSE_CRAFT_RULES } from "./_lib/prose-rules.js";

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

    const { paragraphText, instruction, tone, genre, premise, surroundingContext } = req.body;

    if (!paragraphText || !instruction) {
      return res.status(400).json({ error: "paragraphText and instruction are required" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const tier = await getUserTier(user.id);
    const model = tier === "free" ? "gpt-5.4-nano" : "gpt-5.4-mini";

    const systemPrompt = buildRewritePrompt({ tone, genre, premise });
    const userMessage = buildUserMessage({ paragraphText, instruction, surroundingContext });

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
        max_completion_tokens: 1200,
        temperature: 0.75,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      if (response.status === 429) {
        return res.status(429).json({ error: "Rate limited. Please wait a moment." });
      }
      return res.status(500).json({ error: "AI rewrite failed" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body!.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
    return res.end();
  } catch (e) {
    console.error("rewrite-paragraph error:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
}

function buildRewritePrompt({
  tone,
  genre,
  premise,
}: {
  tone?: string;
  genre?: string;
  premise?: string;
}) {
  let prompt = `You are a seasoned novelist revising a single paragraph in a larger work. Rewrite ONLY the paragraph provided, following the user's instruction. Your rewrite must:
- Match the voice, tone, and style of the surrounding text exactly
- Preserve all plot details, character names, and facts unless the instruction explicitly asks to change them
- Read as a seamless part of the larger narrative — no seams, no tonal shifts
- Be approximately the same length unless the instruction implies otherwise
- Output ONLY the rewritten paragraph text — no commentary, no labels, no quotes
${PROSE_CRAFT_RULES}`;

  if (premise) prompt += `\n\nORIGINAL PREMISE: ${premise}`;
  const toneBlock = getToneDirective(tone);
  if (toneBlock) prompt += `\n\n${toneBlock}`;
  if (genre) prompt += `\n\nGENRE: ${genre}`;

  return prompt;
}

function buildUserMessage({
  paragraphText,
  instruction,
  surroundingContext,
}: {
  paragraphText: string;
  instruction: string;
  surroundingContext?: { before: string; after: string };
}) {
  let msg = "";
  if (surroundingContext?.before) {
    msg += `SURROUNDING CONTEXT (before):\n${surroundingContext.before}\n\n`;
  }
  msg += `PARAGRAPH TO REWRITE:\n${paragraphText}\n\n`;
  if (surroundingContext?.after) {
    msg += `SURROUNDING CONTEXT (after):\n${surroundingContext.after}\n\n`;
  }
  msg += `INSTRUCTION: ${instruction}`;
  return msg;
}

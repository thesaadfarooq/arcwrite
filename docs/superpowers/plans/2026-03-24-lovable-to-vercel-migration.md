# Lovable to Vercel Migration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Lovable dependencies and migrate the Arcwrite app to deploy independently on Vercel with a new Supabase project.

**Architecture:** Frontend stays React+Vite, deployed as a Vercel static site. All 7 Supabase edge functions move to Vercel API routes (`api/` directory). AI functions (generate-section, generate-choices, summarize) use OpenAI streaming server-side to avoid edge timeouts, then return assembled JSON (generate-section streams SSE through to the client). Stripe functions use Node.js runtime (Stripe SDK needs Node APIs). Google OAuth moves from Lovable proxy to native Supabase provider. New Playwright setup from scratch. Local dev uses `vercel dev` to serve both frontend and API routes.

**Tech Stack:** React 18, TypeScript, Vite, Vercel (Edge + Node.js runtimes), Supabase (new project), OpenAI API, Stripe, Playwright

---

## Chunk 1: Lovable Removal & Cleanup

### Task 1: Remove Lovable npm packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Uninstall Lovable packages**

Run: `bun remove @lovable.dev/cloud-auth-js lovable-tagger`

- [ ] **Step 2: Verify package.json no longer references Lovable**

Run: `grep -i lovable package.json`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock bun.lockb
git commit -m "chore: remove lovable npm dependencies"
```

- [ ] **Step 4: Delete package-lock.json (project uses bun)**

The project uses bun as its package manager. `package-lock.json` still contains lovable references and is unnecessary.

```bash
rm package-lock.json
git add package-lock.json
git commit -m "chore: remove package-lock.json (project uses bun)"
```

---

### Task 2: Remove Lovable integration files and directory

**Files:**
- Delete: `src/integrations/lovable/index.ts`
- Delete: `.lovable/plan.md`
- Delete: `.lovable/` (directory)

- [ ] **Step 1: Delete the files**

```bash
rm -rf src/integrations/lovable .lovable
```

- [ ] **Step 2: Verify deletion**

Run: `ls src/integrations/lovable 2>&1; ls .lovable 2>&1`
Expected: "No such file or directory" for both

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove lovable integration files and .lovable directory"
```

---

### Task 3: Clean vite.config.ts

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Remove lovable-tagger import and plugin usage**

Replace the entire file with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Verify build still works**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: remove lovable-tagger from vite config"
```

---

### Task 4: Replace Google OAuth in Auth.tsx (Lovable proxy -> native Supabase)

**Files:**
- Modify: `src/pages/Auth.tsx`

- [ ] **Step 1: Replace the handleGoogleAuth function**

Remove the old implementation (lines 52-61):
```ts
const handleGoogleAuth = async () => {
  try {
    const { lovable } = await import("@/integrations/lovable/index");
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) throw error;
  } catch (err: any) {
    toast.error(err.message || "Google sign-in failed");
  }
};
```

Replace with:
```ts
const handleGoogleAuth = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  } catch (err: any) {
    toast.error(err.message || "Google sign-in failed");
  }
};
```

- [ ] **Step 2: Verify no remaining lovable imports**

Run: `grep -r "lovable" src/`
Expected: No output

- [ ] **Step 3: Verify build succeeds**

Run: `bun run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/Auth.tsx
git commit -m "feat: replace lovable OAuth proxy with native supabase google auth"
```

---

### Task 5: Remove Lovable Playwright config and fixture

**Files:**
- Delete: `playwright.config.ts`
- Delete: `playwright-fixture.ts`

- [ ] **Step 1: Delete the files**

```bash
rm playwright.config.ts playwright-fixture.ts
```

Note: We'll recreate these from scratch in Task 15.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove lovable playwright config (will recreate clean)"
```

---

### Task 6: Update README.md and clean auto-generated comments

**Files:**
- Modify: `README.md`
- Modify: `src/integrations/supabase/client.ts`

- [ ] **Step 1: Rewrite README.md**

```markdown
# Arcwrite

AI-assisted interactive fiction platform. Create branching choose-your-own-adventure stories.

## Development

```bash
bun install
bun run dev       # Dev server on port 8080
bun run build     # Production build
bun run lint      # ESLint
bun run test      # Unit tests
```

## Deployment

Deployed on Vercel. API routes live in `api/` (Edge Functions).

## Stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase, Stripe, OpenAI
```

- [ ] **Step 2: Remove auto-generated comment from supabase client**

In `src/integrations/supabase/client.ts`, remove the comment on line 1:
```ts
// This file is automatically generated. Do not edit it directly.
```

The rest of the file stays the same — `VITE_SUPABASE_PUBLISHABLE_KEY` is the correct env var name (matches Supabase's new key format).

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Succeeds

- [ ] **Step 6: Commit**

```bash
git add README.md src/integrations/supabase/client.ts .env src/lib/story-api.ts
git commit -m "chore: clean up auto-generated comments, standardize env var names, update README"
```

---

### Task 7: Update supabase config for new project

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1: Update project_id**

Replace `project_id = "boszwhcdrocgtilijfus"` with the new Supabase project ID.

```toml
project_id = "<new-project-id>"
```

- [ ] **Step 2: Commit**

```bash
git add supabase/config.toml
git commit -m "chore: update supabase config to new project"
```

---

## Chunk 2: Vercel API Routes (AI Functions with Streaming)

### Task 8: Create Vercel Edge Function for generate-section

**Files:**
- Create: `api/generate-section.ts`

- [ ] **Step 1: Create the edge function**

```ts
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
    const { tone, storyState, summary, recentText, direction, premise, genre, length } =
      await req.json();

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
- Each paragraph should be separated by a blank line`;

  if (tone) prompt += `\n\nTONE: Write in a ${tone} style. Maintain this tone consistently.`;
  if (genre) prompt += `\n\nGENRE: ${genre}`;
  if (storyState && Object.keys(storyState).length > 0) {
    prompt += `\n\nSTORY STATE:\n${JSON.stringify(storyState, null, 2)}`;
  }
  if (summary) prompt += `\n\nSTORY SO FAR (summary):\n${summary}`;
  if (recentText) prompt += `\n\nRECENT TEXT:\n${recentText}`;

  return prompt;
}
```

- [ ] **Step 2: Commit**

```bash
git add api/generate-section.ts
git commit -m "feat: add vercel edge function for generate-section"
```

---

### Task 9: Create Vercel Edge Function for generate-choices (streaming tool calls)

**Files:**
- Create: `api/generate-choices.ts`

- [ ] **Step 1: Create the edge function**

This converts the non-streaming tool-call function to streaming. We stream the tool call argument chunks and return the assembled JSON at the end via a TransformStream.

```ts
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const { recentText, summary, storyState, tone, genre } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

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

    // Stream the tool call argument chunks, assemble, and return final JSON
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let argsBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
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
```

- [ ] **Step 2: Commit**

```bash
git add api/generate-choices.ts
git commit -m "feat: add vercel edge function for generate-choices with streaming tool calls"
```

---

### Task 10: Create Vercel Edge Function for summarize (streaming tool calls)

**Files:**
- Create: `api/summarize.ts`

- [ ] **Step 1: Create the edge function**

Same streaming tool call pattern as generate-choices:

```ts
export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const { fullText, previousSummary, storyState } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

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
        model: "gpt-5.4-mini",
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
        try {
          const parsed = JSON.parse(line.slice(6));
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
```

- [ ] **Step 2: Commit**

```bash
git add api/summarize.ts
git commit -m "feat: add vercel edge function for summarize with streaming tool calls"
```

---

## Chunk 3: Vercel API Routes (Stripe & Export Functions)

### Task 11: Create Vercel Serverless Functions for Stripe operations (Node.js runtime)

**Files:**
- Create: `api/check-subscription.ts`
- Create: `api/create-checkout.ts`
- Create: `api/customer-portal.ts`

- [ ] **Step 1: Install stripe package**

Run: `bun add stripe`

- [ ] **Step 2: Create api/check-subscription.ts**

Note: Stripe SDK requires Node.js APIs (`net`, `http`, `crypto`), so these use `runtime: "nodejs"` instead of `"edge"`. The 10s free-tier timeout is fine for fast Stripe API calls.

```ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return Response.json({ subscribed: false });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const periodEnd = subscription.current_period_end;
      try {
        if (typeof periodEnd === "number") {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        }
      } catch {
        subscriptionEnd = null;
      }
      productId = subscription.items.data[0].price.product;
    }

    return Response.json({ subscribed: hasActiveSub, product_id: productId, subscription_end: subscriptionEnd });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create api/create-checkout.ts**

```ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabase.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { priceId } = await req.json();
    if (!priceId) throw new Error("priceId is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create api/customer-portal.ts**

```ts
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user?.email) throw new Error("Authentication failed");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found for this user");

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/dashboard`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add api/check-subscription.ts api/create-checkout.ts api/customer-portal.ts package.json bun.lock
git commit -m "feat: add vercel edge functions for stripe operations"
```

---

### Task 12: Create Vercel Edge Function for export-story

**Files:**
- Create: `api/export-story.ts`

- [ ] **Step 1: Create the edge function**

```ts
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const { storyId } = await req.json();
    if (!storyId) throw new Error("storyId is required");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Not authenticated");

    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: story, error: storyErr } = await adminClient
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .eq("user_id", userData.user.id)
      .single();

    if (storyErr || !story) throw new Error("Story not found");

    const { data: nodes, error: nodesErr } = await adminClient
      .from("story_nodes")
      .select("text, chosen_option")
      .eq("story_id", storyId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (nodesErr) throw new Error("Failed to fetch story nodes");

    const title = story.title || "Untitled Story";
    const genre = story.genre || "";
    const fullText = (nodes || []).map((n: any) => n.text).join("\n\n");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    let htmlSections = "";
    (nodes || []).forEach((node: any, i: number) => {
      const chapterTitle = node.chosen_option?.label || (i === 0 ? "Opening" : `Section ${i + 1}`);
      const paragraphs = (node.text || "").split("\n\n").filter(Boolean);

      htmlSections += `
        <div style="margin-bottom: 2em;${i > 0 ? " page-break-before: auto;" : ""}">
          <h2 style="font-family: Georgia, serif; font-size: 18px; color: #333; margin-bottom: 12px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px;">
            ${chapterTitle}
          </h2>
          ${paragraphs.map((p: string) => `<p style="font-family: Georgia, serif; font-size: 12px; line-height: 1.8; color: #222; margin-bottom: 1em; text-align: justify;">${escapeHtml(p)}</p>`).join("")}
        </div>
      `;
    });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: Georgia, serif;">
  <div style="text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #333;">
    <h1 style="font-size: 28px; color: #111; margin-bottom: 8px;">${escapeHtml(title)}</h1>
    ${genre ? `<p style="font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 2px;">${escapeHtml(genre)}</p>` : ""}
    <p style="font-size: 12px; color: #999; margin-top: 8px;">${wordCount.toLocaleString()} words</p>
  </div>
  ${htmlSections}
  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
    <p style="font-size: 11px; color: #999;">Created with Arcwrite</p>
  </div>
</body>
</html>`;

    return Response.json({ html, title, wordCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/export-story.ts
git commit -m "feat: add vercel edge function for story export"
```

---

## Chunk 4: Frontend Rewiring & Cleanup

### Task 13: Rewrite story-api.ts to call Vercel API routes

**Files:**
- Modify: `src/lib/story-api.ts`

- [ ] **Step 1: Update the API functions**

Replace the `FUNCTIONS_URL` constant and the three API-calling functions. The Supabase CRUD functions (createStory, getStoryNodes, etc.) stay untouched.

Replace lines 1-4:
```ts
import { supabase } from "@/integrations/supabase/client";
import type { StoryChoice } from "@/components/story/ChoiceCards";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
```

With:
```ts
import { supabase } from "@/integrations/supabase/client";
import type { StoryChoice } from "@/components/story/ChoiceCards";
```

Replace the `streamSection` function (lines 8-94) — change the fetch URL and auth header:

```ts
export async function streamSection({
  premise, genre, tone, direction, summary, recentText, storyState, length, onDelta, onDone, onError,
}: {
  premise?: string; genre?: string; tone?: string; direction?: string;
  summary?: string; recentText?: string; storyState?: any; length?: SectionLength;
  onDelta: (text: string) => void; onDone: (fullText: string) => void; onError: (error: string) => void;
}) {
  try {
    const resp = await fetch("/api/generate-section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ premise, genre, tone, direction, summary, recentText, storyState, length: length || "medium" }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Generation failed" }));
      onError(err.error || "Generation failed");
      return;
    }

    if (!resp.body) { onError("No response body"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    onDone(fullText);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}
```

Replace the `generateChoices` function (lines 96-115):

```ts
export async function generateChoices({
  recentText, summary, storyState, tone, genre,
}: {
  recentText: string; summary?: string; storyState?: any; tone?: string; genre?: string;
}): Promise<StoryChoice[]> {
  const resp = await fetch("/api/generate-choices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recentText, summary, storyState, tone, genre }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Failed to generate choices" }));
    throw new Error(err.error || "Failed to generate choices");
  }

  const data = await resp.json();
  return data.choices || data;
}
```

Replace the `summarizeStory` function (lines 117-132):

```ts
export async function summarizeStory({
  fullText, previousSummary, storyState,
}: {
  fullText: string; previousSummary?: string; storyState?: any;
}): Promise<{ summary: string; story_state: any }> {
  const resp = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullText, previousSummary, storyState }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Failed to summarize" }));
    throw new Error(err.error || "Failed to summarize");
  }

  return resp.json();
}
```

- [ ] **Step 2: Verify no remaining references to FUNCTIONS_URL or supabase.functions.invoke**

Run: `grep -n "FUNCTIONS_URL\|supabase.functions.invoke" src/lib/story-api.ts`
Expected: No output

- [ ] **Step 3: Verify build succeeds**

Run: `bun run build`
Expected: Succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/story-api.ts
git commit -m "feat: rewire story-api to call vercel API routes instead of supabase functions"
```

---

### Task 14: Rewire auth.tsx subscription check to use Vercel API route

**Files:**
- Modify: `src/lib/auth.tsx`

- [ ] **Step 1: Replace supabase.functions.invoke with fetch**

Find the `refreshSubscription` callback (lines 36-56). Replace:

```ts
const { data, error } = await supabase.functions.invoke("check-subscription");
if (error) {
  console.error("Subscription check error:", error);
  return;
}
if (data) {
  setTier(getTierByProductId(data.product_id));
  setSubscriptionEnd(data.subscription_end);
}
```

With:

```ts
const resp = await fetch("/api/check-subscription", {
  headers: { Authorization: `Bearer ${currentSession.access_token}` },
});
if (!resp.ok) {
  console.error("Subscription check error:", resp.status);
  return;
}
const data = await resp.json();
if (data) {
  setTier(getTierByProductId(data.product_id));
  setSubscriptionEnd(data.subscription_end);
}
```

- [ ] **Step 2: Check for any other supabase.functions.invoke calls in the codebase**

Run: `grep -rn "supabase.functions.invoke" src/`

If any hits remain (e.g., in pages that call export-story, create-checkout, customer-portal), update them to use `/api/` routes with the same pattern: `fetch("/api/<name>", { method: "POST", headers: { Authorization: \`Bearer ${session.access_token}\`, "Content-Type": "application/json" }, body: ... })`.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: Succeeds

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.tsx
git commit -m "feat: rewire subscription check to vercel API route"
```

---

### Task 15: Rewire StoryWrite.tsx export-story call

**Files:**
- Modify: `src/pages/StoryWrite.tsx`

- [ ] **Step 1: Replace the export-story fetch call**

Find the export handler (around line 533). Replace:

```ts
const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-story`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
  body: JSON.stringify({ storyId }),
});
```

With:

```ts
const resp = await fetch("/api/export-story", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ storyId }),
});
```

- [ ] **Step 2: Verify no remaining Supabase function URLs in StoryWrite**

Run: `grep -n "functions/v1\|PUBLISHABLE_KEY\|apikey:" src/pages/StoryWrite.tsx`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add src/pages/StoryWrite.tsx
git commit -m "feat: rewire export-story call to vercel API route"
```

---

### Task 16: Rewire Pricing.tsx Stripe calls

**Files:**
- Modify: `src/pages/Pricing.tsx`

- [ ] **Step 1: Replace create-checkout call**

Find the `handleSubscribe` function (around line 37). Replace:

```ts
const { data, error } = await supabase.functions.invoke("create-checkout", {
  body: { priceId },
});
if (error) throw error;
```

With:

```ts
const session = await supabase.auth.getSession();
const accessToken = session.data.session?.access_token;
const resp = await fetch("/api/create-checkout", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ priceId }),
});
if (!resp.ok) {
  const err = await resp.json().catch(() => ({ error: "Failed to start checkout" }));
  throw new Error(err.error);
}
const data = await resp.json();
```

- [ ] **Step 2: Replace customer-portal call**

Find the `handleManage` function (around line 53). Replace:

```ts
const { data, error } = await supabase.functions.invoke("customer-portal");
if (error) throw error;
```

With:

```ts
const session = await supabase.auth.getSession();
const accessToken = session.data.session?.access_token;
const resp = await fetch("/api/customer-portal", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
if (!resp.ok) {
  const err = await resp.json().catch(() => ({ error: "Failed to open portal" }));
  throw new Error(err.error);
}
const data = await resp.json();
```

- [ ] **Step 3: Verify no remaining supabase.functions.invoke calls in Pricing**

Run: `grep -n "supabase.functions.invoke" src/pages/Pricing.tsx`
Expected: No output

- [ ] **Step 4: Commit**

```bash
git add src/pages/Pricing.tsx
git commit -m "feat: rewire pricing page stripe calls to vercel API routes"
```

---

### Task 17: Delete old Supabase edge functions

**Files:**
- Delete: `supabase/functions/` (entire directory)

- [ ] **Step 1: Delete the functions directory**

```bash
rm -rf supabase/functions
```

- [ ] **Step 2: Verify no remaining references to supabase functions in frontend**

Run: `grep -rn "supabase.functions\|FUNCTIONS_URL\|functions/v1" src/`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old supabase edge functions (migrated to vercel)"
```

---

## Chunk 5: Vercel Deployment & Local Dev Configuration

### Task 18: Add Vercel configuration and local dev setup

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

Vite apps deploy to Vercel out of the box, but we need to configure rewrites so SPA routing works:

```json
{
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 2: Create .env.example for documentation**

```
# Supabase (client-side, prefixed with VITE_)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Supabase (server-side, used by API routes)
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
```

- [ ] **Step 3: Update .gitignore to ensure .env is ignored**

Verify `.env` is in `.gitignore`. Add if missing:
```
.env
.env.local
```

- [ ] **Step 4: Update package.json scripts for local dev**

After migration, `bun run dev` (Vite) won't serve the `api/` routes. Update the dev script to use Vercel CLI:

```bash
bun add -D vercel
```

Add/update scripts in `package.json`:
```json
"scripts": {
  "dev": "vercel dev --listen 8080",
  "dev:vite": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`vercel dev` serves both the Vite frontend and the `api/` routes locally, so `fetch("/api/...")` works during development.

- [ ] **Step 5: Commit**

```bash
git add vercel.json .env.example .gitignore package.json bun.lock
git commit -m "feat: add vercel deployment config and local dev setup"
```

---

## Chunk 6: E2E Test Suite (Playwright)

### Task 19: Set up fresh Playwright configuration

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/helpers.ts`

- [ ] **Step 1: Create playwright.config.ts**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "vercel dev --listen 8080",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

- [ ] **Step 2: Create e2e/helpers.ts**

Shared helpers for auth and common operations:

```ts
import { type Page } from "@playwright/test";

export async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto("/auth");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts e2e/helpers.ts
git commit -m "feat: add fresh playwright config and test helpers"
```

---

### Task 20: Write E2E tests — Landing & Navigation

**Files:**
- Modify: `e2e/landing.spec.ts`
- Modify: `e2e/navigation.spec.ts`
- Modify: `e2e/not-found.spec.ts`

- [ ] **Step 1: Rewrite e2e/landing.spec.ts**

Update imports from `"../playwright-fixture"` to `"@playwright/test"` across all test files. Replace content:

```ts
import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section with branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("displays story creation mode cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Start from scratch")).toBeVisible();
    await expect(page.locator("text=Pick a genre")).toBeVisible();
    await expect(page.locator("text=Surprise me")).toBeVisible();
  });

  test("theme toggle works", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("unauthenticated user sees sign-in button", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("sign-in button navigates to auth page", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Sign in");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("story mode card redirects to auth if not logged in", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Start from scratch");
    await expect(page).toHaveURL(/\/auth/);
  });
});
```

- [ ] **Step 2: Rewrite e2e/navigation.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("/ loads landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
  });

  test("/pricing loads pricing page", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Plus")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
  });

  test("/dashboard redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("/story/new redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/story/new");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("unknown routes show 404 page", async ({ page }) => {
    await page.goto("/nonexistent-page");
    await expect(page.locator("text=404")).toBeVisible();
  });
});
```

- [ ] **Step 3: Rewrite e2e/not-found.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("404 Page", () => {
  test("shows not found message", async ({ page }) => {
    await page.goto("/some-random-path");
    await expect(page.locator("text=404")).toBeVisible();
  });

  test("has a link back to home", async ({ page }) => {
    await page.goto("/some-random-path");
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add e2e/landing.spec.ts e2e/navigation.spec.ts e2e/not-found.spec.ts
git commit -m "test: rewrite landing, navigation, 404 E2E tests without lovable fixtures"
```

---

### Task 21: Write E2E tests — Auth

**Files:**
- Modify: `e2e/auth.spec.ts`

- [ ] **Step 1: Rewrite e2e/auth.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Auth Page", () => {
  test("renders login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows Google OAuth button", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("text=Continue with Google")).toBeVisible();
  });

  test("can switch to signup mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await expect(page.locator("text=Create your account")).toBeVisible();
  });

  test("can switch to forgot password mode", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await expect(page.locator("text=Reset your password")).toBeVisible();
    // Google button should be hidden in forgot mode
    await expect(page.locator("text=Continue with Google")).not.toBeVisible();
  });

  test("can switch back to login from forgot password", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Forgot password?");
    await page.click("text=Back to sign in");
    await expect(page.locator("text=Welcome back")).toBeVisible();
  });

  test("password visibility toggle works", async ({ page }) => {
    await page.goto("/auth");
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveAttribute("type", "password");
    // Click the eye toggle button (sibling of the input)
    await page.locator('input#password + button').click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });

  test("shows validation error for short password on signup", async ({ page }) => {
    await page.goto("/auth");
    await page.click("text=Sign up");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[type="password"]', "123");
    await page.click('button[type="submit"]');
    // Browser validation should prevent submission (minLength=6)
    const passwordInput = page.locator('input#password');
    const validity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);
  });

  test("theme toggle is present on auth page", async ({ page }) => {
    await page.goto("/auth");
    // The theme toggle button should exist in the top right
    const themeButton = page.locator("button.fixed");
    await expect(themeButton).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: rewrite auth E2E tests"
```

---

### Task 22: Write E2E tests — Dashboard

**Files:**
- Modify: `e2e/dashboard.spec.ts`

- [ ] **Step 1: Rewrite e2e/dashboard.spec.ts**

Note: Dashboard requires auth. These tests verify the page structure when unauthenticated (redirect) and use test descriptions that document what authenticated tests should verify.

```ts
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/);
  });

  // Authenticated tests require test user setup.
  // When test credentials are available, add:
  // - test("displays empty state for new user")
  // - test("shows story cards when stories exist")
  // - test("can toggle between grid and list view")
  // - test("can create a new story from dashboard")
  // - test("can rename a story inline")
  // - test("can delete a story")
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/dashboard.spec.ts
git commit -m "test: rewrite dashboard E2E tests"
```

---

### Task 23: Write E2E tests — Pricing, Shared Story, Story Creation

**Files:**
- Modify: `e2e/pricing.spec.ts`
- Modify: `e2e/shared-story.spec.ts`
- Modify: `e2e/story-new.spec.ts`
- Modify: `e2e/story-write.spec.ts`

- [ ] **Step 1: Rewrite e2e/pricing.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Pricing Page", () => {
  test("renders all three tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Plus")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
  });

  test("shows prices for paid tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=9.99")).toBeVisible();
    await expect(page.locator("text=15.99")).toBeVisible();
  });

  test("free tier shows limits", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=2 stories")).toBeVisible();
    await expect(page.locator("text=5 chapters")).toBeVisible();
  });
});
```

- [ ] **Step 2: Rewrite e2e/shared-story.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Shared Story", () => {
  test("invalid share token shows error or empty state", async ({ page }) => {
    await page.goto("/s/invalid-token-12345");
    // Should show some kind of error or empty state, not crash
    await expect(page).toHaveURL(/\/s\//);
  });
});
```

- [ ] **Step 3: Rewrite e2e/story-new.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Story Creation", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/story/new");
    await expect(page).toHaveURL(/\/auth/);
  });
});
```

- [ ] **Step 4: Rewrite e2e/story-write.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Story Editor", () => {
  test("redirects to auth when not logged in", async ({ page }) => {
    await page.goto("/story/some-id");
    await expect(page).toHaveURL(/\/auth/);
  });

  // Authenticated tests require test user + story setup.
  // When available, add:
  // - test("loads story and displays content")
  // - test("can generate a section (streaming)")
  // - test("can generate choices")
  // - test("can select a choice and continue")
  // - test("chapter sidebar shows chapters")
  // - test("can navigate between chapters")
  // - test("tone panel opens and allows changes")
  // - test("story title is editable inline")
});
```

- [ ] **Step 5: Commit**

```bash
git add e2e/pricing.spec.ts e2e/shared-story.spec.ts e2e/story-new.spec.ts e2e/story-write.spec.ts
git commit -m "test: rewrite pricing, shared-story, story-new, story-write E2E tests"
```

---

### Task 24: Write E2E tests — Theme, Responsive, Reset Password

**Files:**
- Modify: `e2e/theme.spec.ts`
- Modify: `e2e/responsive.spec.ts`
- Modify: `e2e/reset-password.spec.ts`

- [ ] **Step 1: Rewrite e2e/theme.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Theme", () => {
  test("defaults to a theme class on html", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const cls = await html.getAttribute("class");
    expect(cls).toBeTruthy();
  });

  test("persists theme choice across page loads", async ({ page }) => {
    await page.goto("/");
    // Toggle theme
    await page.locator("button").filter({ has: page.locator("svg") }).first().click();
    const newClass = await page.locator("html").getAttribute("class");

    // Reload and verify
    await page.reload();
    const afterReload = await page.locator("html").getAttribute("class");
    expect(afterReload).toBe(newClass);
  });
});
```

- [ ] **Step 2: Rewrite e2e/responsive.spec.ts**

```ts
import { test, expect, devices } from "@playwright/test";

test.describe("Responsive Design", () => {
  test("landing page is usable on mobile", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("text=Arcwrite")).toBeVisible();
    await expect(page.locator("text=Sign in")).toBeVisible();
    await context.close();
  });

  test("auth page is usable on mobile", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();
    await page.goto("/auth");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await context.close();
  });

  test("pricing page is usable on mobile", async ({ browser }) => {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await context.newPage();
    await page.goto("/pricing");
    await expect(page.locator("text=Free")).toBeVisible();
    await expect(page.locator("text=Plus")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
    await context.close();
  });
});
```

- [ ] **Step 3: Rewrite e2e/reset-password.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Reset Password", () => {
  test("reset password page loads", async ({ page }) => {
    await page.goto("/reset-password");
    await page.waitForLoadState("networkidle");
    // Page should render without crashing
    await expect(page.locator("body")).toBeVisible();
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add e2e/theme.spec.ts e2e/responsive.spec.ts e2e/reset-password.spec.ts
git commit -m "test: rewrite theme, responsive, reset-password E2E tests"
```

---

### Task 25: Clean up remaining Lovable E2E test files and verify

**Files:**
- Modify: `e2e/edge-functions.spec.ts`
- Modify: `e2e/subscription.spec.ts`

- [ ] **Step 1: Rewrite e2e/edge-functions.spec.ts to test Vercel API routes**

```ts
import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  test("generate-section endpoint exists", async ({ request }) => {
    const resp = await request.post("/api/generate-section", {
      data: {},
    });
    // Should return an error (missing params) but not 404
    expect(resp.status()).not.toBe(404);
  });

  test("generate-choices endpoint exists", async ({ request }) => {
    const resp = await request.post("/api/generate-choices", {
      data: {},
    });
    expect(resp.status()).not.toBe(404);
  });

  test("summarize endpoint exists", async ({ request }) => {
    const resp = await request.post("/api/summarize", {
      data: {},
    });
    expect(resp.status()).not.toBe(404);
  });
});
```

- [ ] **Step 2: Rewrite e2e/subscription.spec.ts**

```ts
import { test, expect } from "@playwright/test";

test.describe("Subscription", () => {
  test("check-subscription endpoint exists", async ({ request }) => {
    const resp = await request.post("/api/check-subscription", { data: {} });
    // Should return error (no auth header) but not 404
    expect(resp.status()).not.toBe(404);
  });
});
```

- [ ] **Step 3: Final grep to ensure zero lovable references remain**

Run: `grep -ri "lovable" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" --include="*.toml" .`
Expected: No output (excluding node_modules, which is gitignored)

- [ ] **Step 4: Run the full E2E suite**

Run: `npx playwright test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add e2e/edge-functions.spec.ts e2e/subscription.spec.ts
git commit -m "test: rewrite edge-functions and subscription E2E tests for vercel API routes"
```

---

## Chunk 7: Final Verification

### Task 26: Full build and test verification

- [ ] **Step 1: Clean install**

```bash
rm -rf node_modules
bun install
```

- [ ] **Step 2: Lint**

Run: `bun run lint`
Expected: No errors

- [ ] **Step 3: Unit tests**

Run: `bun run test`
Expected: All pass

- [ ] **Step 4: Build**

Run: `bun run build`
Expected: Succeeds, dist/ directory created

- [ ] **Step 5: Final lovable audit**

Run: `grep -ri "lovable" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" --include="*.html" --exclude-dir=node_modules --exclude-dir=.git`
Expected: No output

- [ ] **Step 6: Verify API route files exist**

```bash
ls api/
```
Expected: `check-subscription.ts  create-checkout.ts  customer-portal.ts  export-story.ts  generate-choices.ts  generate-section.ts  summarize.ts`

- [ ] **Step 7: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup and verification after lovable migration"
```

---

## Environment Variables Checklist

Before deploying to Vercel, set these in the Vercel dashboard:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel env | Client-side Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel env | Client-side Supabase publishable key |
| `SUPABASE_URL` | Vercel env | Server-side Supabase URL (API routes) |
| `SUPABASE_PUBLISHABLE_KEY` | Vercel env | Server-side publishable key (API routes auth) |
| `SUPABASE_SECRET_KEY` | Vercel env | Server-side secret key (export-story admin access) |
| `OPENAI_API_KEY` | Vercel env | AI generation |
| `STRIPE_SECRET_KEY` | Vercel env | Stripe operations |

## Supabase Setup Checklist

1. Create new Supabase project
2. Run all 4 migrations from `supabase/migrations/` in order
3. Configure Google OAuth provider in Auth settings (client ID + secret from Google Cloud Console)
4. Set site URL and redirect URLs in Auth settings to match your Vercel domain

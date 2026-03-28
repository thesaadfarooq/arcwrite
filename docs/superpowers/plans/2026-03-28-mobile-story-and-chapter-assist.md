# Mobile Story Experience & Assisted Chaptering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the story editor for phones around a story-first layout while adding passive AI-assisted chapter review that helps users define chapters without changing desktop behavior.

**Architecture:** Keep the current node-based story model and chapter mutations, but extract the large `StoryWrite` page into mobile and desktop shells. Mobile uses a bottom utility bar plus `Structure`/`Tools` bottom sheets. Chapter review is additive: a pure helper module decides prompt eligibility, a new AI route returns at most two chapter suggestions, and applying those suggestions reuses the existing split and rename APIs.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (`sheet`, `tabs`, `dialog`, `dropdown-menu`), Vitest, Testing Library, Playwright, Vercel API routes, OpenAI API, Postgres-backed story node routes

**Spec:** `docs/superpowers/specs/2026-03-28-mobile-story-and-chapter-assist-design.md`

---

## File Structure

### New files

| File | Responsibility |
| --- | --- |
| `src/lib/chapter-review.ts` | Chapter review types, eligibility constants, prompt/staleness helpers |
| `api/generate-chapter-suggestions.ts` | Authenticated AI route that returns at most two chapter suggestions for the active path tail |
| `src/components/story/MobileStoryBar.tsx` | Sticky mobile bottom bar with `Write`, `Structure`, and `Tools` actions |
| `src/components/story/StoryStructureSheet.tsx` | Bottom sheet with `Chapters` / `Timeline` tabs and review slot |
| `src/components/story/StoryToolsSheet.tsx` | Bottom sheet for tone, export, share, and theme actions |
| `src/components/story/ChapterReviewPrompt.tsx` | Quiet prompt shown in the story flow when chapter review is eligible |
| `src/components/story/ChapterEditModeBar.tsx` | Edit-mode banner for explicit chapter splitting on mobile |
| `src/components/story/StoryWriteMobileShell.tsx` | Mobile-only story editor shell |
| `src/components/story/StoryWriteDesktopShell.tsx` | Desktop wrapper for the current sidebar-first layout |
| `src/test/chapter-review.test.ts` | Unit coverage for chapter-review timing and staleness helpers |
| `src/test/generate-chapter-suggestions.test.ts` | Route tests for the new chapter suggestion endpoint |
| `src/test/story-structure-sheet.test.tsx` | Component tests for the mobile structure sheet and tabs |
| `src/test/story-canvas-chapter-edit-mode.test.tsx` | Component tests for chapter edit mode and visible split markers |
| `e2e/story-write-mobile.spec.ts` | Authenticated mobile smoke test for the phone-sized editor flow |

### Modified files

| File | Changes |
| --- | --- |
| `src/pages/StoryWrite.tsx` | Extract shell rendering, add mobile state, chapter review state, sessionStorage checkpointing, and suggestion apply/dismiss flow |
| `src/components/story/StoryCanvas.tsx` | Add explicit chapter edit mode props, visible split markers, and touch-safe heading actions |
| `src/components/story/ChapterSidebar.tsx` | Add embedded variant, review slot, and permanent touch-safe `More` trigger |
| `src/components/story/StoryTimeline.tsx` | Add embedded variant and explicit touch-safe fork action |
| `src/components/story/TonePanel.tsx` | Extract reusable inline tone content so the mobile tools sheet can reuse the same tone UI |
| `src/lib/api-client.ts` | Add low-level `generateChapterSuggestions()` request helper |
| `src/lib/story-api.ts` | Add story-level chapter suggestion wrapper and shared request/response types |
| `src/test/api-client.test.ts` | Cover the new authenticated chapter suggestion request |
| `src/test/story-api-migration.test.ts` | Cover the new story-api wrapper and apply-flow plumbing |
| `src/test/story-write-arc.test.tsx` | Add desktop-regression and prompt invalidation cases around `StoryWrite` orchestration |
| `e2e/helpers.ts` | Add env-backed authenticated login helper reuse for the new story mobile smoke |

### Reused UI primitives

| File | Use |
| --- | --- |
| `src/components/ui/sheet.tsx` | `side="bottom"` structure/tools sheets |
| `src/components/ui/tabs.tsx` | `Chapters` / `Timeline` tabs inside the structure sheet |

---

## Task 1: Add Chapter Review Domain Helpers

**Files:**
- Create: `src/lib/chapter-review.ts`
- Create: `src/test/chapter-review.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/test/chapter-review.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  CHAPTER_REVIEW_COOLDOWN_TURNS,
  CHAPTER_REVIEW_EARLY_TURNS,
  CHAPTER_REVIEW_LONG_CHAPTER_WORDS,
  CHAPTER_REVIEW_MIN_NEW_TURNS,
  countWordsSinceChapterStart,
  isChapterSuggestionsStale,
  shouldOfferChapterReview,
  type ChapterReviewCheckpoint,
} from "@/lib/chapter-review";

describe("chapter review helpers", () => {
  const checkpoint: ChapterReviewCheckpoint = {
    reviewedAtTurns: 2,
    dismissedAtTurns: null,
    reviewedTipId: "node-2",
  };

  it("offers review after four new active turns", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 6,
        currentTipId: "node-6",
        checkpoint,
        beatPhaseChanged: false,
        wordsSinceChapterStart: 900,
      })
    ).toBe(true);
  });

  it("offers review after three turns when the beat changed", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 5,
        currentTipId: "node-5",
        checkpoint,
        beatPhaseChanged: true,
        wordsSinceChapterStart: 700,
      })
    ).toBe(true);
  });

  it("offers review after three turns when the current chapter is long", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 5,
        currentTipId: "node-5",
        checkpoint,
        beatPhaseChanged: false,
        wordsSinceChapterStart: CHAPTER_REVIEW_LONG_CHAPTER_WORDS + 25,
      })
    ).toBe(true);
  });

  it("suppresses review during the dismiss cooldown", () => {
    expect(
      shouldOfferChapterReview({
        activeTurns: 6,
        currentTipId: "node-6",
        checkpoint: {
          ...checkpoint,
          dismissedAtTurns: 5,
        },
        beatPhaseChanged: true,
        wordsSinceChapterStart: CHAPTER_REVIEW_LONG_CHAPTER_WORDS + 25,
      })
    ).toBe(false);
  });

  it("marks suggestions stale when the active tip changes", () => {
    expect(
      isChapterSuggestionsStale({
        suggestionsTipId: "node-4",
        currentTipId: "node-5",
      })
    ).toBe(true);
  });

  it("counts words since the most recent chapter start", () => {
    expect(
      countWordsSinceChapterStart([
        { text: "Opening words only", startsChapter: true },
        { text: "Middle node with several more words", startsChapter: false },
        { text: "Newest node has the final five words", startsChapter: false },
      ])
    ).toBe(12);
  });

  it("exports the tuned thresholds used by StoryWrite", () => {
    expect(CHAPTER_REVIEW_MIN_NEW_TURNS).toBe(4);
    expect(CHAPTER_REVIEW_EARLY_TURNS).toBe(3);
    expect(CHAPTER_REVIEW_COOLDOWN_TURNS).toBe(2);
  });
});
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run:

```bash
npm run test -- src/test/chapter-review.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/chapter-review'` or missing exports.

- [ ] **Step 3: Implement the pure helper module**

Create `src/lib/chapter-review.ts`:

```typescript
export const CHAPTER_REVIEW_MIN_NEW_TURNS = 4;
export const CHAPTER_REVIEW_EARLY_TURNS = 3;
export const CHAPTER_REVIEW_LONG_CHAPTER_WORDS = 1400;
export const CHAPTER_REVIEW_COOLDOWN_TURNS = 2;

export type ChapterSuggestionType = "start_new_chapter_here" | "rename_recent_chapter";

export interface ChapterSuggestion {
  type: ChapterSuggestionType;
  anchorNodeId: string;
  anchorParagraphIndex: number | null;
  proposedTitle: string | null;
  reason: string;
}

export interface ChapterReviewCheckpoint {
  reviewedAtTurns: number;
  dismissedAtTurns: number | null;
  reviewedTipId: string | null;
}

export function shouldOfferChapterReview({
  activeTurns,
  currentTipId,
  checkpoint,
  beatPhaseChanged,
  wordsSinceChapterStart,
}: {
  activeTurns: number;
  currentTipId: string | null;
  checkpoint: ChapterReviewCheckpoint;
  beatPhaseChanged: boolean;
  wordsSinceChapterStart: number;
}) {
  if (!currentTipId) return false;

  const turnsSinceReview = activeTurns - checkpoint.reviewedAtTurns;
  const turnsSinceDismiss =
    checkpoint.dismissedAtTurns == null ? Number.POSITIVE_INFINITY : activeTurns - checkpoint.dismissedAtTurns;

  if (turnsSinceDismiss < CHAPTER_REVIEW_COOLDOWN_TURNS) return false;
  if (turnsSinceReview >= CHAPTER_REVIEW_MIN_NEW_TURNS) return true;

  return (
    turnsSinceReview >= CHAPTER_REVIEW_EARLY_TURNS &&
    (beatPhaseChanged || wordsSinceChapterStart >= CHAPTER_REVIEW_LONG_CHAPTER_WORDS)
  );
}

export function isChapterSuggestionsStale({
  suggestionsTipId,
  currentTipId,
}: {
  suggestionsTipId: string | null;
  currentTipId: string | null;
}) {
  return !suggestionsTipId || !currentTipId || suggestionsTipId !== currentTipId;
}

export function countWordsSinceChapterStart(
  activeNodes: Array<{ text: string; startsChapter: boolean }>
) {
  const lastChapterIndex = activeNodes.map((node) => node.startsChapter).lastIndexOf(true);
  const relevant = lastChapterIndex === -1 ? activeNodes : activeNodes.slice(lastChapterIndex);

  return relevant.reduce((sum, node) => {
    return sum + node.text.split(/\s+/).filter(Boolean).length;
  }, 0);
}
```

- [ ] **Step 4: Run the helper test to verify it passes**

Run:

```bash
npm run test -- src/test/chapter-review.test.ts
```

Expected: PASS with 7 passing tests.

- [ ] **Step 5: Commit the helper module**

```bash
git add src/lib/chapter-review.ts src/test/chapter-review.test.ts
git commit -m "feat: add chapter review helper module"
```

---

## Task 2: Add the Chapter Suggestion API Route and Client Wrappers

**Files:**
- Create: `api/generate-chapter-suggestions.ts`
- Modify: `src/lib/api-client.ts:49-149`
- Modify: `src/lib/story-api.ts:1-243`
- Modify: `src/test/api-client.test.ts`
- Modify: `src/test/story-api-migration.test.ts`
- Create: `src/test/generate-chapter-suggestions.test.ts`

- [ ] **Step 1: Write the failing route and wrapper tests**

Create `src/test/generate-chapter-suggestions.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserMock = vi.fn();
const unauthorizedResponseMock = vi.fn();

vi.mock("../../api/_lib/auth", () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  unauthorizedResponse: unauthorizedResponseMock,
}));

function openAIStreamResponse(argumentsJson: unknown) {
  const chunk = JSON.stringify({
    choices: [
      {
        delta: {
          tool_calls: [
            {
              function: {
                arguments: JSON.stringify(argumentsJson),
              },
            },
          ],
        },
      },
    ],
  });

  return new Response(`data: ${chunk}\n\n`, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

describe("generate-chapter-suggestions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("requests at most two chapter suggestions for the active-path tail", async () => {
    getAuthenticatedUserMock.mockResolvedValue({ id: "user-1" });
    vi.mocked(fetch).mockResolvedValue(
      openAIStreamResponse({
        suggestions: [
          {
            type: "start_new_chapter_here",
            anchorNodeId: "node-5",
            anchorParagraphIndex: 2,
            proposedTitle: "The Viaduct",
            reason: "Location shift and a new objective begin here.",
          },
          {
            type: "rename_recent_chapter",
            anchorNodeId: "node-4",
            anchorParagraphIndex: null,
            proposedTitle: "The Bargain",
            reason: "The chapter now centers on the pact.",
          },
        ],
      })
    );

    const handler = (await import("../../api/generate-chapter-suggestions")).default;
    const response = await handler(
      new Request("http://localhost/api/generate-chapter-suggestions", {
        method: "POST",
        headers: { authorization: "Bearer token", "Content-Type": "application/json" },
        body: JSON.stringify({
          premise: "A distant signal calls the crew inland.",
          tone: "Atmospheric",
          genre: "Mystery",
          summary: "The crew crossed the marsh and found a ruined viaduct.",
          beat: { phase: "rising", progress: 0.46 },
          recentNodes: [
            { id: "node-4", text: "They argued over the map.", startsChapter: true, chapterTitle: "Old title" },
            { id: "node-5", text: "She crossed the viaduct at dusk. The radio crackled again.", startsChapter: false, chapterTitle: null },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      suggestions: [
        expect.objectContaining({ type: "start_new_chapter_here", anchorNodeId: "node-5" }),
        expect.objectContaining({ type: "rename_recent_chapter", anchorNodeId: "node-4" }),
      ],
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(init?.body as string);
    expect(payload.messages[0].content).toContain("active branch");
    expect(payload.tools[0].function.parameters.properties.suggestions.maxItems).toBe(2);
  });
});
```

Append to `src/test/api-client.test.ts`:

```typescript
  it("posts authenticated chapter review requests", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ suggestions: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { apiClient } = await import("@/lib/api-client");
    await apiClient.generateChapterSuggestions({
      recentNodes: [{ id: "node-1", text: "Text", startsChapter: true, chapterTitle: "Arrival" }],
      beat: { phase: "rising", progress: 0.4 },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/generate-chapter-suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer session-token",
      },
      body: JSON.stringify({
        recentNodes: [{ id: "node-1", text: "Text", startsChapter: true, chapterTitle: "Arrival" }],
        beat: { phase: "rising", progress: 0.4 },
      }),
    });
  });
```

Append to `src/test/story-api-migration.test.ts`:

```typescript
  // Add this to the apiClientMock object at the top of the file:
  // generateChapterSuggestions: vi.fn(),

  it("routes chapter suggestion generation through the API client", async () => {
    apiClientMock.generateChapterSuggestions.mockResolvedValue({
      suggestions: [
        {
          type: "rename_recent_chapter",
          anchorNodeId: "node-3",
          anchorParagraphIndex: null,
          proposedTitle: "The Bargain",
          reason: "The conflict has crystallized.",
        },
      ],
    });
    const storyApi = await import("@/lib/story-api");

    await expect(
      storyApi.generateChapterSuggestions({
        recentNodes: [{ id: "node-3", text: "A bargain is struck.", startsChapter: true, chapterTitle: "Chapter 2" }],
        beat: { phase: "falling", progress: 0.76 },
      })
    ).resolves.toEqual([
      expect.objectContaining({ type: "rename_recent_chapter", anchorNodeId: "node-3" }),
    ]);
  });
```

- [ ] **Step 2: Run the focused route and wrapper tests to verify they fail**

Run:

```bash
npm run test -- src/test/generate-chapter-suggestions.test.ts src/test/api-client.test.ts src/test/story-api-migration.test.ts
```

Expected: FAIL with missing route/module or missing `generateChapterSuggestions` client methods.

- [ ] **Step 3: Implement the route and the wrappers**

Create `api/generate-chapter-suggestions.ts`:

```typescript
import { getAuthenticatedUser, unauthorizedResponse } from "./_lib/auth.js";

export const config = { runtime: "edge" };

type ReviewNode = {
  id: string;
  text: string;
  startsChapter: boolean;
  chapterTitle: string | null;
};

type Beat = {
  phase?: "setup" | "rising" | "climax" | "falling" | "resolution";
  progress?: number;
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

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
          // ignore malformed chunks
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
```

Update `src/lib/api-client.ts` inside the `apiClient` object:

```typescript
  generateChapterSuggestions(payload: Record<string, unknown>) {
    return request<{ suggestions: any[] }>("/api/generate-chapter-suggestions", {
      method: "POST",
      body: payload,
    });
  },
```

Update `src/lib/story-api.ts` near the other exported types and wrappers:

```typescript
import type { ChapterSuggestion } from "@/lib/chapter-review";

export async function generateChapterSuggestions({
  recentNodes,
  premise,
  tone,
  genre,
  summary,
  beat,
}: {
  recentNodes: Array<{ id: string; text: string; startsChapter: boolean; chapterTitle: string | null }>;
  premise?: string;
  tone?: string;
  genre?: string;
  summary?: string;
  beat?: StoryBeat;
}): Promise<ChapterSuggestion[]> {
  const result = await apiClient.generateChapterSuggestions({
    recentNodes,
    premise,
    tone,
    genre,
    summary,
    beat,
  });

  return result.suggestions ?? [];
}
```

- [ ] **Step 4: Run the focused route and wrapper tests to verify they pass**

Run:

```bash
npm run test -- src/test/generate-chapter-suggestions.test.ts src/test/api-client.test.ts src/test/story-api-migration.test.ts
```

Expected: PASS for all three files.

- [ ] **Step 5: Commit the route and wrapper work**

```bash
git add api/generate-chapter-suggestions.ts src/lib/api-client.ts src/lib/story-api.ts src/test/generate-chapter-suggestions.test.ts src/test/api-client.test.ts src/test/story-api-migration.test.ts
git commit -m "feat: add chapter suggestion generation route"
```

---

## Task 3: Build the Reusable Mobile Story Surfaces

**Files:**
- Create: `src/components/story/MobileStoryBar.tsx`
- Create: `src/components/story/StoryStructureSheet.tsx`
- Create: `src/components/story/StoryToolsSheet.tsx`
- Create: `src/components/story/ChapterReviewPrompt.tsx`
- Modify: `src/components/story/TonePanel.tsx`
- Create: `src/test/story-structure-sheet.test.tsx`

- [ ] **Step 1: Write the failing mobile-surface tests**

Create `src/test/story-structure-sheet.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileStoryBar } from "@/components/story/MobileStoryBar";
import { StoryStructureSheet } from "@/components/story/StoryStructureSheet";

describe("mobile story surfaces", () => {
  it("renders the mobile bottom bar actions", () => {
    render(
      <MobileStoryBar
        onWrite={vi.fn()}
        onStructure={vi.fn()}
        onTools={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /write/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /structure/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tools/i })).toBeInTheDocument();
  });

  it("renders review content and switches between chapter and timeline tabs", () => {
    render(
      <StoryStructureSheet
        open
        onOpenChange={vi.fn()}
        reviewSlot={<div>Review chapter structure</div>}
        chaptersSlot={<div>Chapter list</div>}
        timelineSlot={<div>Timeline list</div>}
      />
    );

    expect(screen.getByText("Review chapter structure")).toBeInTheDocument();
    expect(screen.getByText("Chapter list")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /timeline/i }));
    expect(screen.getByText("Timeline list")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the mobile-surface test to verify it fails**

Run:

```bash
npm run test -- src/test/story-structure-sheet.test.tsx
```

Expected: FAIL with missing components.

- [ ] **Step 3: Implement the mobile bar, the sheets, and reusable tone content**

Create `src/components/story/MobileStoryBar.tsx`:

```typescript
import { BookOpen, FolderTree, SlidersHorizontal } from "lucide-react";

export function MobileStoryBar({
  onWrite,
  onStructure,
  onTools,
}: {
  onWrite: () => void;
  onStructure: () => void;
  onTools: () => void;
}) {
  return (
    <div className="sticky bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <button type="button" onClick={onWrite} className="rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Write</span>
        </button>
        <button type="button" onClick={onStructure} className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">
          <span className="inline-flex items-center gap-1.5"><FolderTree className="h-3.5 w-3.5" />Structure</span>
        </button>
        <button type="button" onClick={onTools} className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">
          <span className="inline-flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Tools</span>
        </button>
      </div>
    </div>
  );
}
```

Create `src/components/story/ChapterReviewPrompt.tsx`:

```typescript
export function ChapterReviewPrompt({
  suggestionCount,
  onReview,
}: {
  suggestionCount?: number;
  onReview: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card/80 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {suggestionCount && suggestionCount > 0
              ? `${suggestionCount} chapter suggestion${suggestionCount === 1 ? "" : "s"} ready`
              : "Review chapter structure"}
          </p>
          <p className="text-xs text-muted-foreground">Review when convenient.</p>
        </div>
        <button type="button" onClick={onReview} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
          Review
        </button>
      </div>
    </div>
  );
}
```

Create `src/components/story/StoryStructureSheet.tsx`:

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StoryStructureSheet({
  open,
  onOpenChange,
  reviewSlot,
  chaptersSlot,
  timelineSlot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewSlot: React.ReactNode;
  chaptersSlot: React.ReactNode;
  timelineSlot: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl px-0">
        <SheetHeader className="px-4 pb-3 text-left">
          <SheetTitle>Structure</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="chapters" className="px-4 pb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="chapters" className="space-y-4">
            {reviewSlot}
            {chaptersSlot}
          </TabsContent>
          <TabsContent value="timeline">
            {timelineSlot}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
```

Create `src/components/story/StoryToolsSheet.tsx`:

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TonePanelContent } from "@/components/story/TonePanel";

export function StoryToolsSheet({
  open,
  onOpenChange,
  currentTone,
  onToneChange,
  toolsSlot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTone?: string;
  onToneChange: (tone: string) => void;
  toolsSlot?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-3 text-left">
          <SheetTitle>Tools</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <TonePanelContent currentTone={currentTone} onToneChange={onToneChange} onDone={() => onOpenChange(false)} />
          {toolsSlot}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Refactor `src/components/story/TonePanel.tsx` so it exports reusable inline content:

```typescript
const presetTones = [
  "Dark & gritty",
  "Whimsical & light",
  "Literary & introspective",
  "Fast-paced & cinematic",
  "Poetic & dreamlike",
  "Humorous & witty",
] as const;

export function TonePanelContent({
  currentTone,
  onToneChange,
  onDone,
}: {
  currentTone: string | undefined;
  onToneChange: (tone: string) => void;
  onDone: () => void;
}) {
  const [customTone, setCustomTone] = useState("");

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Story Tone</span>
        </div>
        <button type="button" onClick={onDone} className="rounded-md p-1 hover:bg-secondary">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-1.5">
        {presetTones.map((tone) => (
          <button
            key={tone}
            type="button"
            onClick={() => {
              onToneChange(tone);
              onDone();
            }}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all ${
              currentTone === tone
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {tone}
            {currentTone === tone ? <Check className="h-3 w-3" /> : null}
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="flex gap-2">
          <input
            value={customTone}
            onChange={(event) => setCustomTone(event.target.value)}
            placeholder="Custom tone…"
            className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
          <button
            type="button"
            disabled={customTone.trim().length < 3}
            onClick={() => {
              onToneChange(customTone.trim());
              setCustomTone("");
              onDone();
            }}
            className="rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

export function TonePanel({ currentTone, onToneChange, isOpen, onClose }: TonePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-4 top-14 z-30 w-64 rounded-xl border border-border bg-card p-4 shadow-lg animate-fade-in">
      <TonePanelContent currentTone={currentTone} onToneChange={onToneChange} onDone={onClose} />
    </div>
  );
}
```

- [ ] **Step 4: Run the mobile-surface test to verify it passes**

Run:

```bash
npm run test -- src/test/story-structure-sheet.test.tsx
```

Expected: PASS with 2 passing tests.

- [ ] **Step 5: Commit the reusable mobile surfaces**

```bash
git add src/components/story/MobileStoryBar.tsx src/components/story/StoryStructureSheet.tsx src/components/story/StoryToolsSheet.tsx src/components/story/ChapterReviewPrompt.tsx src/components/story/TonePanel.tsx src/test/story-structure-sheet.test.tsx
git commit -m "feat: add mobile story structure surfaces"
```

---

## Task 4: Make Chapter Editing and Timeline Actions Touch-Safe

**Files:**
- Create: `src/components/story/ChapterEditModeBar.tsx`
- Modify: `src/components/story/StoryCanvas.tsx:15-236`
- Modify: `src/components/story/ChapterSidebar.tsx:28-186`
- Modify: `src/components/story/StoryTimeline.tsx:15-188`
- Create: `src/test/story-canvas-chapter-edit-mode.test.tsx`

- [ ] **Step 1: Write the failing touch-surface tests**

Create `src/test/story-canvas-chapter-edit-mode.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryCanvas } from "@/components/story/StoryCanvas";

describe("StoryCanvas chapter edit mode", () => {
  it("shows visible split markers only when chapter edit mode is enabled", () => {
    const onInsertBreak = vi.fn();
    const paragraphs = [
      { id: "node-1-0", text: "First paragraph." },
      { id: "node-1-1", text: "Second paragraph." },
      { id: "node-1-2", text: "Third paragraph." },
    ];

    const { rerender } = render(
      <StoryCanvas
        paragraphs={paragraphs}
        onInsertBreak={onInsertBreak}
        chapterEditMode={false}
      />
    );

    expect(screen.queryByRole("button", { name: /chapter break/i })).not.toBeInTheDocument();

    rerender(
      <StoryCanvas
        paragraphs={paragraphs}
        onInsertBreak={onInsertBreak}
        chapterEditMode
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /chapter break/i })[0]);
    expect(onInsertBreak).toHaveBeenCalledWith("node-1", 1);
  });
});
```

- [ ] **Step 2: Run the touch-surface test to verify it fails**

Run:

```bash
npm run test -- src/test/story-canvas-chapter-edit-mode.test.tsx
```

Expected: FAIL because `chapterEditMode` does not exist yet and split markers are still hover-only.

- [ ] **Step 3: Implement explicit chapter edit mode and permanent touch actions**

Create `src/components/story/ChapterEditModeBar.tsx`:

```typescript
export function ChapterEditModeBar({
  active,
  onDone,
}: {
  active: boolean;
  onDone: () => void;
}) {
  if (!active) return null;

  return (
    <div className="sticky top-12 z-10 mb-6 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Chapter edit mode</p>
        <p className="text-xs text-muted-foreground">Tap a marker between paragraphs to start a new chapter.</p>
      </div>
      <button type="button" onClick={onDone} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
        Done
      </button>
    </div>
  );
}
```

Update `src/components/story/StoryCanvas.tsx` props and rendering:

```typescript
interface StoryCanvasProps {
  paragraphs: StoryParagraph[];
  onEdit?: (id: string, newText: string) => void;
  isEditable?: boolean;
  chapterHeadings?: ChapterHeading[];
  onInsertBreak?: (nodeId: string, paragraphIndex: number) => void;
  onRenameChapter?: (nodeId: string, newTitle: string) => void;
  chapterEditMode?: boolean;
}

export function StoryCanvas({
  paragraphs,
  onEdit,
  isEditable = true,
  chapterHeadings,
  onInsertBreak,
  onRenameChapter,
  chapterEditMode = false,
}: StoryCanvasProps) {
  // ...
  {onInsertBreak && chapterEditMode && !isFirstOfNode && paraIndex > 0 && (
    <div className="relative py-3">
      <button
        type="button"
        onClick={() => onInsertBreak(nodeId, paraIndex)}
        className="mx-auto flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary"
        aria-label="Chapter break"
      >
        <SplitSquareVertical className="h-3 w-3" />
        <span>Chapter break</span>
      </button>
    </div>
  )}
```

Update `src/components/story/ChapterSidebar.tsx`:

```typescript
interface ChapterSidebarProps {
  chapters: Chapter[];
  totalWords: number;
  onChapterClick: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
  onMerge?: (id: string) => void;
  reviewSlot?: React.ReactNode;
  embedded?: boolean;
  onEnterEditMode?: () => void;
}
```

Use the new props in the render tree:

```typescript
      {!embedded && (
        <div className="p-4 border-b border-border">
          {/* existing header */}
        </div>
      )}

      {reviewSlot ? <div className="p-2">{reviewSlot}</div> : null}

      {onEnterEditMode ? (
        <div className="px-2 pb-2">
          <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onEnterEditMode}>
            Edit chapters
          </Button>
        </div>
      ) : null}
```

And replace the hover-revealed menu container with a permanently visible trigger on mobile/embedded:

```typescript
                <div className={`absolute right-1 ${embedded ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
```

Update `src/components/story/StoryTimeline.tsx` to support an embedded/mobile mode:

```typescript
interface StoryTimelineProps {
  nodes: TimelineNode[];
  currentNodeId: string | null;
  onJumpToNode: (nodeId: string) => void;
  onForkFromNode: (nodeId: string) => void;
  totalWords: number;
  storyTitle: string;
  embedded?: boolean;
}
```

Then replace the hover-only fork control with a visible action when embedded:

```typescript
                  {!isCurrent && (
                    <div className={`${embedded ? "flex" : "hidden group-hover:flex"} items-center gap-1 ml-7 mt-0.5`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onForkFromNode(node.id);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Fork here
                      </button>
                    </div>
                  )}
```

- [ ] **Step 4: Run the touch-surface test to verify it passes**

Run:

```bash
npm run test -- src/test/story-canvas-chapter-edit-mode.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the touch-safe chapter surfaces**

```bash
git add src/components/story/ChapterEditModeBar.tsx src/components/story/StoryCanvas.tsx src/components/story/ChapterSidebar.tsx src/components/story/StoryTimeline.tsx src/test/story-canvas-chapter-edit-mode.test.tsx
git commit -m "feat: add touch-safe chapter editing surfaces"
```

---

## Task 5: Integrate Mobile/Desktop Shells and Passive Chapter Review in StoryWrite

**Files:**
- Create: `src/components/story/StoryWriteMobileShell.tsx`
- Create: `src/components/story/StoryWriteDesktopShell.tsx`
- Modify: `src/pages/StoryWrite.tsx:156-1067`
- Modify: `src/test/story-write-arc.test.tsx`

- [ ] **Step 1: Write the failing StoryWrite mobile and review-flow tests**

Append to `src/test/story-write-arc.test.tsx` after the existing hoisted mocks:

```typescript
const useIsMobileMock = vi.hoisted(() => vi.fn());
const generateChapterSuggestionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock("@/lib/story-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/story-api")>();
  return {
    ...actual,
    generateChapterSuggestions: generateChapterSuggestionsMock,
  };
});

describe("StoryWrite mobile integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIsMobileMock.mockReturnValue(true);
    generateChapterSuggestionsMock.mockResolvedValue([
      {
        type: "start_new_chapter_here",
        anchorNodeId: "node-4",
        anchorParagraphIndex: 1,
        proposedTitle: "The Viaduct",
        reason: "A clear location change begins here.",
      },
    ]);
    sessionStorage.clear();
  });

  it("shows the mobile structure bar instead of the desktop sidebar", async () => {
    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /structure/i })).toBeInTheDocument());
    expect(screen.queryByTestId("chapter-sidebar")).not.toBeInTheDocument();
  });

  it("opens chapter review from the quiet prompt and requests suggestions once per current tip", async () => {
    renderStoryWrite();

    await waitFor(() => expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /review/i }));

    await waitFor(() => expect(generateChapterSuggestionsMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/the viaduct/i)).toBeInTheDocument();
  });
});
```

Append to `src/test/story-write-arc.test.tsx`:

```typescript
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

  it("keeps the desktop sidebar path available when not on mobile", async () => {
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("chapter-sidebar")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /structure/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the StoryWrite tests to verify they fail**

Run:

```bash
npm run test -- src/test/story-write-arc.test.tsx
```

Expected: FAIL because the shell components, prompt flow, and chapter suggestion integration do not exist yet.

- [ ] **Step 3: Extract mobile/desktop shells and wire chapter review state**

Create `src/components/story/StoryWriteDesktopShell.tsx`:

```typescript
export function StoryWriteDesktopShell({
  header,
  sidebar,
  content,
}: {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-background transition-colors duration-500 relative">
      {header}
      <div className="flex-1 flex overflow-hidden">
        {sidebar}
        <main className="flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  );
}
```

Create `src/components/story/StoryWriteMobileShell.tsx`:

```typescript
import { MobileStoryBar } from "@/components/story/MobileStoryBar";

export function StoryWriteMobileShell({
  header,
  content,
  onWrite,
  onShowStructure,
  onShowTools,
  structureSheet,
  toolsSheet,
}: {
  header: React.ReactNode;
  content: React.ReactNode;
  onWrite: () => void;
  onShowStructure: () => void;
  onShowTools: () => void;
  structureSheet: React.ReactNode;
  toolsSheet: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col bg-background">
      {header}
      <main className="flex-1 overflow-y-auto">{content}</main>
      <MobileStoryBar onWrite={onWrite} onStructure={onShowStructure} onTools={onShowTools} />
      {structureSheet}
      {toolsSheet}
    </div>
  );
}
```

Update `src/pages/StoryWrite.tsx`:

1. Add imports:

```typescript
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ChapterReviewPrompt,
} from "@/components/story/ChapterReviewPrompt";
import { ChapterEditModeBar } from "@/components/story/ChapterEditModeBar";
import { StoryWriteMobileShell } from "@/components/story/StoryWriteMobileShell";
import { StoryWriteDesktopShell } from "@/components/story/StoryWriteDesktopShell";
import { StoryStructureSheet } from "@/components/story/StoryStructureSheet";
import { StoryToolsSheet } from "@/components/story/StoryToolsSheet";
import {
  countWordsSinceChapterStart,
  isChapterSuggestionsStale,
  shouldOfferChapterReview,
  type ChapterReviewCheckpoint,
  type ChapterSuggestion,
} from "@/lib/chapter-review";
import { generateChapterSuggestions } from "@/lib/story-api";
```

2. Add new state near the existing `useState` block:

```typescript
  const isMobile = useIsMobile();
  const [structureOpen, setStructureOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [chapterEditMode, setChapterEditMode] = useState(false);
  const [chapterSuggestions, setChapterSuggestions] = useState<ChapterSuggestion[]>([]);
  const [chapterSuggestionsTipId, setChapterSuggestionsTipId] = useState<string | null>(null);
  const [chapterReviewCheckpoint, setChapterReviewCheckpoint] = useState<ChapterReviewCheckpoint>({
    reviewedAtTurns: 0,
    dismissedAtTurns: null,
    reviewedTipId: null,
  });
```

3. Add a sessionStorage hydrate/persist pair:

```typescript
  useEffect(() => {
    if (!storyId) return;
    const raw = sessionStorage.getItem(`chapter-review:${storyId}`);
    if (!raw) return;
    try {
      setChapterReviewCheckpoint(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem(`chapter-review:${storyId}`);
    }
  }, [storyId]);

  useEffect(() => {
    if (!storyId) return;
    sessionStorage.setItem(`chapter-review:${storyId}`, JSON.stringify(chapterReviewCheckpoint));
  }, [storyId, chapterReviewCheckpoint]);
```

4. Derive review eligibility:

```typescript
  const wordsSinceChapterStart = useMemo(() => {
    return countWordsSinceChapterStart(
      activeNodes.map((node) => ({
        text: node.text || "",
        startsChapter: Boolean((node as any).starts_chapter),
      }))
    );
  }, [activeNodes]);

  const chapterReviewEligible = useMemo(() => {
    return shouldOfferChapterReview({
      activeTurns: activeNodes.length,
      currentTipId: lastNodeId,
      checkpoint: chapterReviewCheckpoint,
      beatPhaseChanged: currentBeat.phase === "falling" || currentBeat.phase === "resolution",
      wordsSinceChapterStart,
    });
  }, [activeNodes.length, chapterReviewCheckpoint, currentBeat.phase, lastNodeId, wordsSinceChapterStart]);
```

5. Add the review opener:

```typescript
  const handleOpenChapterReview = async () => {
    setStructureOpen(true);

    if (!isChapterSuggestionsStale({ suggestionsTipId: chapterSuggestionsTipId, currentTipId: lastNodeId })) {
      return;
    }

    const recentNodes = activeNodes.slice(-6).map((node) => ({
      id: node.id,
      text: node.text || "",
      startsChapter: Boolean((node as any).starts_chapter),
      chapterTitle: (node as any).chapter_title || null,
    }));

    const suggestions = await generateChapterSuggestions({
      recentNodes,
      premise: storyMeta.premise,
      tone: storyMeta.tone,
      genre: storyMeta.genre,
      summary,
      beat: buildBeatPayload(currentBeat, false),
    });

    setChapterSuggestions(suggestions);
    setChapterSuggestionsTipId(lastNodeId);
    setChapterReviewCheckpoint({
      reviewedAtTurns: activeNodes.length,
      dismissedAtTurns: null,
      reviewedTipId: lastNodeId,
    });
  };
```

6. Add apply and dismiss handlers:

```typescript
  const handleDismissChapterReview = () => {
    setChapterSuggestions([]);
    setChapterSuggestionsTipId(null);
    setChapterReviewCheckpoint((prev) => ({
      ...prev,
      dismissedAtTurns: activeNodes.length,
    }));
  };

  const handleApplyChapterSuggestion = async (suggestion: ChapterSuggestion) => {
    if (suggestion.type === "rename_recent_chapter" && suggestion.proposedTitle) {
      await handleChapterRename(suggestion.anchorNodeId, suggestion.proposedTitle);
    }

    if (suggestion.type === "start_new_chapter_here" && typeof suggestion.anchorParagraphIndex === "number") {
      await handleInsertBreak(suggestion.anchorNodeId, suggestion.anchorParagraphIndex);
    }

    setChapterSuggestions([]);
    setChapterSuggestionsTipId(null);
  };
```

7. Replace the inline desktop-only return with shell selection:

```typescript
  const reviewPrompt =
    chapterReviewEligible && !isDesyncced && !isProcessing ? (
      <ChapterReviewPrompt
        suggestionCount={chapterSuggestions.length || undefined}
        onReview={handleOpenChapterReview}
      />
    ) : null;
```

Extract the large inline JSX into shell-friendly chunks:

```typescript
  const header = (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border/50 bg-background/80 backdrop-blur-sm shrink-0 z-10">
      <div className="flex items-center gap-2">
        {!isMobile ? (
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors active:scale-95">
            <PanelLeft className="w-4 h-4" />
          </button>
        ) : null}
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-primary" />
          <EditableStoryTitle title={storyTitle} onRename={async (title) => { setStoryTitle(title); await updateStoryTitle(storyId!, title); }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
        {!isMobile ? (
          <button onClick={() => setToneOpen(!toneOpen)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors active:scale-95">
            <Palette className="w-3 h-3" />
            <span className="hidden sm:inline">{storyMeta.tone || "Set tone"}</span>
          </button>
        ) : null}
      </div>
    </header>
  );

  const desktopSidebar = sidebarOpen ? (
    <aside className="w-56 shrink-0 border-r border-border/50 bg-card/50 overflow-hidden flex flex-col animate-fade-in">
      <div className="flex border-b border-border">
        <button onClick={() => setSidebarTab("chapters")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${sidebarTab === "chapters" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <Hash className="w-3 h-3" />
          Chapters
        </button>
        <button onClick={() => setSidebarTab("timeline")} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${sidebarTab === "timeline" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
          <GitBranch className="w-3 h-3" />
          Timeline
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {sidebarTab === "chapters" ? (
          <ChapterSidebar
            chapters={chapters}
            totalWords={wordCount}
            onChapterClick={handleChapterClick}
            onRename={handleChapterRename}
            onDelete={handleChapterDelete}
            onMerge={handleChapterMerge}
          />
        ) : (
          <StoryTimeline
            nodes={timelineNodes}
            currentNodeId={lastNodeId}
            onJumpToNode={handleJumpToNode}
            onForkFromNode={handleForkFromNode}
            totalWords={wordCount}
            storyTitle={storyTitle}
          />
        )}
      </div>
    </aside>
  ) : null;

  const toolsActions = (
    <div className="grid gap-2">
      <button type="button" onClick={handleExport} disabled={!limits.export || isExporting} className="rounded-xl bg-secondary px-3 py-2 text-left text-xs">
        {limits.export ? "Export PDF" : "Export requires Plus or Pro"}
      </button>
      <button type="button" onClick={handleShare} disabled={!limits.sharing} className="rounded-xl bg-secondary px-3 py-2 text-left text-xs">
        {limits.sharing ? (shareToken ? "Copy share link" : "Share story") : "Sharing requires Pro"}
      </button>
      <button type="button" onClick={toggleTheme} className="rounded-xl bg-secondary px-3 py-2 text-left text-xs">
        Toggle {theme === "light" ? "dark" : "light"} mode
      </button>
    </div>
  );

  const content = (
    <div className={isMobile ? "px-4 py-6" : "max-w-[680px] mx-auto px-6 md:px-12 py-12 md:py-16"}>
      {!isMobile ? (
        <EditableTitle
          title={chapters.length > 0 ? chapters[0].title : "Chapter 1"}
          onRename={chapters.length > 0 ? (title: string) => handleChapterRename(chapters[0].id, title) : undefined}
        />
      ) : null}

      <ChapterEditModeBar active={chapterEditMode} onDone={() => setChapterEditMode(false)} />
      <StoryCanvas
        paragraphs={paragraphs}
        onEdit={handleEdit}
        chapterHeadings={chapterHeadings}
        onInsertBreak={handleInsertBreak}
        onRenameChapter={handleChapterRename}
        chapterEditMode={chapterEditMode}
      />
      {reviewPrompt}

      {isProcessing && !isGenerating ? (
        <div className="mt-6 flex items-center gap-3 text-muted-foreground animate-fade-in">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Saving and preparing choices…</span>
        </div>
      ) : null}

      {isDesyncced && !isGenerating && !isProcessing ? (
        <div className="mt-6 p-4 rounded-xl border border-choice-risky/30 bg-choice-risky/5 flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-choice-risky shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Text was edited</p>
            <p className="text-xs text-muted-foreground">Future options may not match your changes.</p>
          </div>
          <button onClick={handleRealign} className="text-xs font-medium text-primary hover:underline shrink-0">
            Re-align story
          </button>
        </div>
      ) : null}

      {!isDesyncced && !isProcessing ? (
        isStoryComplete ? (
          <StoryComplete
            onShare={limits.sharing ? handleShare : undefined}
            onExport={limits.export ? handleExport : undefined}
            onDashboard={() => navigate("/dashboard")}
            onContinue={handleContinueAnyway}
          />
        ) : (
          <ChoiceCards
            choices={choices}
            onSelect={handleChoiceSelect}
            onRegenerate={() => fetchChoices(paragraphs.slice(-3).map((p) => p.text).join("\n\n"), { activeNodeCount: activeNodes.length })}
            isLoading={isGenerating || isLoadingChoices}
            isNearEnd={currentBeat.isNearEnd}
            onBeginConclusion={handleBeginConclusion}
            isStoryComplete={isStoryComplete}
            sectionLength={sectionLength}
            onSectionLengthChange={setSectionLength}
            turnCount={limits.turns !== Infinity ? activeNodes.length : undefined}
            turnLimit={limits.turns !== Infinity ? limits.turns : undefined}
          />
        )
      ) : null}

      <div className={isMobile ? "h-28" : "h-24"} />
    </div>
  );
```

Pass the new props into `StoryCanvas`:

```typescript
            <ChapterEditModeBar active={chapterEditMode} onDone={() => setChapterEditMode(false)} />
            <StoryCanvas
              paragraphs={paragraphs}
              onEdit={handleEdit}
              chapterHeadings={chapterHeadings}
              onInsertBreak={handleInsertBreak}
              onRenameChapter={handleChapterRename}
              chapterEditMode={chapterEditMode}
            />
            {reviewPrompt}
```

Use embedded chapter/timeline variants in the mobile `StoryStructureSheet`:

```typescript
  const structureSheet = (
    <StoryStructureSheet
      open={structureOpen}
      onOpenChange={setStructureOpen}
      reviewSlot={
        chapterSuggestions.length > 0 ? (
          <div className="space-y-2">
            {chapterSuggestions.map((suggestion) => (
              <div key={`${suggestion.type}-${suggestion.anchorNodeId}`} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-medium text-foreground">
                  {suggestion.proposedTitle || suggestion.type}
                </p>
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void handleApplyChapterSuggestion(suggestion)} className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground">
                    Apply
                  </button>
                  <button type="button" onClick={handleDismissChapterReview} className="rounded-lg bg-secondary px-3 py-2 text-xs">
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : reviewPrompt
      }
      chaptersSlot={
        <ChapterSidebar
          chapters={chapters}
          totalWords={wordCount}
          onChapterClick={handleChapterClick}
          onRename={handleChapterRename}
          onDelete={handleChapterDelete}
          onMerge={handleChapterMerge}
          embedded
          onEnterEditMode={() => {
            setStructureOpen(false);
            setChapterEditMode(true);
          }}
        />
      }
      timelineSlot={
        <StoryTimeline
          nodes={timelineNodes}
          currentNodeId={lastNodeId}
          onJumpToNode={handleJumpToNode}
          onForkFromNode={handleForkFromNode}
          totalWords={wordCount}
          storyTitle={storyTitle}
          embedded
        />
      }
    />
  );
```

Finally, branch the shell:

```typescript
  if (isMobile) {
    return (
      <StoryWriteMobileShell
        header={header}
        content={content}
        onWrite={() => {
          setStructureOpen(false);
          setToolsOpen(false);
          setChapterEditMode(false);
        }}
        onShowStructure={() => setStructureOpen(true)}
        onShowTools={() => setToolsOpen(true)}
        structureSheet={structureSheet}
        toolsSheet={
          <StoryToolsSheet
            open={toolsOpen}
            onOpenChange={setToolsOpen}
            currentTone={storyMeta.tone}
            onToneChange={handleToneChange}
            toolsSlot={toolsActions}
          />
        }
      />
    );
  }

  return <StoryWriteDesktopShell header={header} sidebar={desktopSidebar} content={content} />;
```

- [ ] **Step 4: Run the StoryWrite tests to verify they pass**

Run:

```bash
npm run test -- src/test/story-write-arc.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the StoryWrite integration**

```bash
git add src/components/story/StoryWriteMobileShell.tsx src/components/story/StoryWriteDesktopShell.tsx src/pages/StoryWrite.tsx src/test/story-write-arc.test.tsx
git commit -m "feat: add mobile story shell and chapter review flow"
```

---

## Task 6: Add Mobile Story Smoke Coverage and Final Verification

**Files:**
- Create: `e2e/story-write-mobile.spec.ts`
- Modify: `e2e/helpers.ts`

- [ ] **Step 1: Add an authenticated Playwright helper entry point**

Append to `e2e/helpers.ts`:

```typescript
export function getStoryTestCredentials() {
  const email = process.env.PW_TEST_EMAIL;
  const password = process.env.PW_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error("PW_TEST_EMAIL and PW_TEST_PASSWORD must be set for authenticated story e2e tests");
  }

  return { email, password };
}
```

- [ ] **Step 2: Write the mobile smoke test**

Create `e2e/story-write-mobile.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { getStoryTestCredentials, loginWithEmail } from "./helpers";

test.describe("Story Write Page (mobile)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens the mobile structure sheet without the desktop sidebar", async ({ page }) => {
    const { email, password } = getStoryTestCredentials();

    await loginWithEmail(page, email, password);
    await page.goto("/story/new");

    await page.getByPlaceholder(/what kind of story/i).fill("A radio operator follows a signal into the marsh.");
    await page.getByRole("button", { name: /begin writing/i }).click();

    await page.waitForURL(/\/story\//);
    await expect(page.getByRole("button", { name: /structure/i })).toBeVisible();
    await expect(page.locator("aside")).toHaveCount(0);

    await page.getByRole("button", { name: /structure/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("tab", { name: /chapters/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /timeline/i })).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the focused test suites and the production build**

Run:

```bash
npm run test -- src/test/chapter-review.test.ts src/test/generate-chapter-suggestions.test.ts src/test/story-structure-sheet.test.tsx src/test/story-canvas-chapter-edit-mode.test.tsx src/test/story-write-arc.test.tsx src/test/api-client.test.ts src/test/story-api-migration.test.ts
npm run build
PW_TEST_EMAIL=your-test-user@example.com PW_TEST_PASSWORD=your-password npx playwright test e2e/story-write-mobile.spec.ts
```

Expected:

- Vitest: PASS
- Build: PASS
- Playwright: PASS on a phone-sized viewport when authenticated credentials are configured

- [ ] **Step 4: Commit the final verification coverage**

```bash
git add e2e/helpers.ts e2e/story-write-mobile.spec.ts
git commit -m "test: add mobile story editor smoke coverage"
```

---

## Verification Checklist

- `StoryWrite` keeps the desktop sidebar path intact when `useIsMobile()` is false.
- Mobile story reading text no longer shares horizontal space with a persistent sidebar.
- The mobile bottom bar exposes `Write`, `Structure`, and `Tools`.
- The structure sheet uses tabs, not separate chapter/timeline buttons.
- Chapter split markers appear only in explicit chapter edit mode.
- Chapter rows and timeline rows no longer rely on hover for secondary actions on mobile.
- The review prompt appears only after the tuned chapter-review thresholds are met.
- Review suggestions are generated only for the current active tip and are invalidated when the tip changes.
- Applying a suggestion reuses the existing split/rename APIs.
- Dismissing review sets the cooldown and suppresses immediate re-prompting.

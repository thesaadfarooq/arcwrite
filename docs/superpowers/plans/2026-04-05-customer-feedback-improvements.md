# Customer Feedback Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address six customer feedback items — AI prose quality, text length options, chapter-at-a-time view, and inline AI paragraph rewrite — shipping everything in one release.

**Architecture:** Four parallel workstreams: (1) Prompt engineering changes in `api/generate-section.ts` and shared prose rules, (2) new "Brief" length preset in API + UI, (3) chapter-at-a-time view mode in `StoryCanvas` with mobile default + desktop toggle, (4) new `api/rewrite-paragraph.ts` endpoint + `ParagraphBlock` action bar with inline AI rewrite flow.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Vercel Edge Functions, OpenAI streaming API, Supabase.

---

## File Structure

### New Files
- `api/rewrite-paragraph.ts` — Edge runtime streaming endpoint for single-paragraph AI rewrite
- `api/_lib/prose-rules.ts` — Shared prose craft rules (naturalness, name usage, word variety) used by both `generate-section` and `rewrite-paragraph`
- `src/components/story/ParagraphActionBar.tsx` — Action bar component (Edit / Rewrite buttons) shown on paragraph click
- `src/components/story/RewriteInput.tsx` — Inline instruction input + Accept/Revert controls for AI rewrite
- `src/components/story/ChapterNavigation.tsx` — Prev/Next chapter navigation + "Chapter X of Y" indicator
- `src/lib/rewrite-api.ts` — Client-side function to call `api/rewrite-paragraph` with streaming

### Modified Files
- `api/generate-section.ts` — Updated opening line + import shared prose rules
- `src/lib/tone-profiles.ts` — Export `getToneDirective` (already exported, no change needed)
- `src/lib/story-api.ts` — Add `"brief"` to `SectionLength` type
- `src/components/story/ChoiceCards.tsx` — Add Brief option to `LENGTH_OPTIONS`
- `src/components/story/StoryCanvas.tsx` — Chapter view filtering, updated `ParagraphBlock` with action bar, rewrite state
- `src/pages/StoryWrite.tsx` — Chapter view state management, focus mode toggle, rewrite handler, pass new props
- `src/components/story/StoryWriteDesktopShell.tsx` — Accept focus mode toggle prop
- `src/components/story/StoryWriteMobileShell.tsx` — No structural changes (chapter view handled via props to content)

---

## Task 1: Shared Prose Rules Module

**Files:**
- Create: `api/_lib/prose-rules.ts`

- [ ] **Step 1: Create the shared prose rules module**

```typescript
// api/_lib/prose-rules.ts

/**
 * Shared prose-craft rules injected into both generate-section and rewrite-paragraph prompts.
 * Centralised here so both endpoints stay in sync.
 */
export const PROSE_CRAFT_RULES = `- Write like a seasoned novelist — match prose intensity to the moment. Descriptive or figurative language should feel earned by the scene, not applied uniformly. Some sentences should be plain and functional, serving the plot. Maintain a coherent voice across the entire section; don't let each paragraph become its own stylistic showcase.
- Handle character names the way published fiction does. Introduce with full name, then naturally shift to first name, pronouns, or contextual descriptors ("the detective", "her brother"). Only return to full name when there's genuine narrative reason — after a long absence, a formal moment, or to distinguish between characters. This is basic craft; trust your instinct as a writer.
- Avoid reusing the same distinctive word or phrase within a short span. Trust your instincts as a novelist — natural variety means picking a different angle, not the most exotic synonym. Plain repetition of common words (said, the, was) is fine.`;
```

- [ ] **Step 2: Commit**

```bash
git add api/_lib/prose-rules.ts
git commit -m "feat: add shared prose craft rules module"
```

---

## Task 2: Update generate-section Prompt

**Files:**
- Modify: `api/generate-section.ts:1-2` (imports), `api/generate-section.ts:158-167` (system prompt)

- [ ] **Step 1: Add import for prose rules**

At `api/generate-section.ts` line 2, add the import:

```typescript
import { PROSE_CRAFT_RULES } from "./_lib/prose-rules.js";
```

- [ ] **Step 2: Update the system prompt opening and rules**

In the `buildSystemPrompt` function, replace the current opening and rules block (lines 158-167):

Old:
```typescript
  let prompt = `You are a master storyteller and prose writer. Write rich, immersive narrative prose.

RULES:
- Write ${paragraphInstruction} of polished, publishable prose
- Show, don't tell. Use vivid sensory details
- Maintain consistent characterization and plot continuity
- ${pacingInstruction}
- Do NOT include meta-commentary, options, or questions — just write the story
- Each paragraph should be separated by a blank line
- When naming characters, be creative and varied. Never default to common AI-generated names like "Mara", "Kael", "Elara", "Lyra", or "Aric". Choose distinctive names that fit the specific genre, setting, and cultural context of the story.`;
```

New:
```typescript
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
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add api/generate-section.ts
git commit -m "feat: add prose craft rules to generate-section prompt"
```

---

## Task 3: Add Brief Length Preset

**Files:**
- Modify: `api/generate-section.ts:6-11` (LENGTH_PRESETS)
- Modify: `src/lib/story-api.ts:9` (SectionLength type)
- Modify: `src/components/story/ChoiceCards.tsx:57-62` (LENGTH_OPTIONS)

- [ ] **Step 1: Add brief preset to the API**

In `api/generate-section.ts`, update `LENGTH_PRESETS` (line 6-11):

Old:
```typescript
const LENGTH_PRESETS: Record<string, { paragraphs: string; maxTokens: number }> = {
  short:  { paragraphs: "1-2 paragraphs (~100 words)", maxTokens: 500 },
  medium: { paragraphs: "2-3 paragraphs (~250 words)", maxTokens: 1200 },
  long:   { paragraphs: "4-6 paragraphs (~500 words)", maxTokens: 2500 },
  epic:   { paragraphs: "8-10 paragraphs (~1000 words)", maxTokens: 4000 },
};
```

New:
```typescript
const LENGTH_PRESETS: Record<string, { paragraphs: string; maxTokens: number }> = {
  brief:  { paragraphs: "1 short paragraph (~50 words)", maxTokens: 250 },
  short:  { paragraphs: "1-2 paragraphs (~100 words)", maxTokens: 500 },
  medium: { paragraphs: "2-3 paragraphs (~250 words)", maxTokens: 1200 },
  long:   { paragraphs: "4-6 paragraphs (~500 words)", maxTokens: 2500 },
  epic:   { paragraphs: "8-10 paragraphs (~1000 words)", maxTokens: 4000 },
};
```

- [ ] **Step 2: Update the SectionLength type**

In `src/lib/story-api.ts` line 9:

Old:
```typescript
export type SectionLength = "short" | "medium" | "long" | "epic";
```

New:
```typescript
export type SectionLength = "brief" | "short" | "medium" | "long" | "epic";
```

- [ ] **Step 3: Add Brief to the UI length options**

In `src/components/story/ChoiceCards.tsx`, update `LENGTH_OPTIONS` (lines 57-62):

Old:
```typescript
const LENGTH_OPTIONS: { value: SectionLength; label: string; desc: string }[] = [
  { value: "short", label: "Short", desc: "~100w" },
  { value: "medium", label: "Medium", desc: "~250w" },
  { value: "long", label: "Long", desc: "~500w" },
  { value: "epic", label: "Epic", desc: "~1000w" },
];
```

New:
```typescript
const LENGTH_OPTIONS: { value: SectionLength; label: string; desc: string }[] = [
  { value: "brief", label: "Brief", desc: "~50w" },
  { value: "short", label: "Short", desc: "~100w" },
  { value: "medium", label: "Medium", desc: "~250w" },
  { value: "long", label: "Long", desc: "~500w" },
  { value: "epic", label: "Epic", desc: "~1000w" },
];
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds. No type errors.

- [ ] **Step 5: Commit**

```bash
git add api/generate-section.ts src/lib/story-api.ts src/components/story/ChoiceCards.tsx
git commit -m "feat: add Brief (~50w) length preset"
```

---

## Task 4: Chapter Navigation Component

**Files:**
- Create: `src/components/story/ChapterNavigation.tsx`

- [ ] **Step 1: Create the ChapterNavigation component**

```tsx
// src/components/story/ChapterNavigation.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChapterNavigationProps {
  currentIndex: number;
  totalChapters: number;
  currentTitle: string;
  onPrev: () => void;
  onNext: () => void;
}

export function ChapterNavigation({
  currentIndex,
  totalChapters,
  currentTitle,
  onPrev,
  onNext,
}: ChapterNavigationProps) {
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < totalChapters - 1;

  return (
    <div className="flex items-center justify-between py-3 px-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!hasPrev}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Prev
      </button>
      <span className="text-xs font-medium text-muted-foreground">
        {currentTitle}
        <span className="ml-1.5 opacity-60">
          {currentIndex + 1}/{totalChapters}
        </span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/story/ChapterNavigation.tsx
git commit -m "feat: add ChapterNavigation component"
```

---

## Task 5: Chapter-at-a-Time View in StoryCanvas

**Files:**
- Modify: `src/components/story/StoryCanvas.tsx:15-25` (props), `src/components/story/StoryCanvas.tsx:27-129` (rendering)

- [ ] **Step 1: Add chapter view props to StoryCanvas**

In `StoryCanvas.tsx`, add new props to the `StoryCanvasProps` interface (lines 15-25). Add the import for `ChapterNavigation` at the top.

At the top of the file, add the import:
```typescript
import { ChapterNavigation } from "@/components/story/ChapterNavigation";
```

Update the interface:

Old:
```typescript
interface StoryCanvasProps {
  paragraphs: StoryParagraph[];
  onEdit?: (id: string, newText: string) => void;
  isEditable?: boolean;
  chapterHeadings?: ChapterHeading[];
  onInsertBreak?: (nodeId: string, paragraphIndex: number) => void;
  onRenameChapter?: (nodeId: string, newTitle: string) => void;
  chapterEditMode?: boolean;
  pendingBreakKey?: string | null;
  breakTargetNodeIds?: string[];
}
```

New:
```typescript
interface StoryCanvasProps {
  paragraphs: StoryParagraph[];
  onEdit?: (id: string, newText: string) => void;
  isEditable?: boolean;
  chapterHeadings?: ChapterHeading[];
  onInsertBreak?: (nodeId: string, paragraphIndex: number) => void;
  onRenameChapter?: (nodeId: string, newTitle: string) => void;
  chapterEditMode?: boolean;
  pendingBreakKey?: string | null;
  breakTargetNodeIds?: string[];
  chapterViewEnabled?: boolean;
  activeChapterIndex?: number;
  onChapterNavigate?: (index: number) => void;
}
```

- [ ] **Step 2: Implement chapter filtering in the StoryCanvas component**

Update the `StoryCanvas` function signature to destructure the new props, and add chapter filtering logic before rendering.

In the `StoryCanvas` function, after destructuring props and before the `headingMap` block, add:

```typescript
  // --- Chapter-at-a-time view filtering ---
  const chapterNodeIds = chapterHeadings?.map((h) => h.nodeId) ?? [];
  const totalChapters = chapterNodeIds.length || 1;

  // When chapter view is enabled, filter paragraphs to the active chapter only
  let visibleParagraphs = paragraphs;
  if (chapterViewEnabled && chapterNodeIds.length > 0 && activeChapterIndex !== undefined) {
    const chapterStartId = chapterNodeIds[activeChapterIndex];
    const nextChapterStartId = chapterNodeIds[activeChapterIndex + 1] ?? null;

    let inChapter = false;
    visibleParagraphs = paragraphs.filter((p) => {
      const nodeId = p.id.includes("-") ? p.id.substring(0, p.id.lastIndexOf("-")) : p.id;
      if (nodeId === chapterStartId) inChapter = true;
      if (nextChapterStartId && nodeId === nextChapterStartId) inChapter = false;
      return inChapter;
    });
  }
```

Then replace `paragraphs.map` in the JSX with `visibleParagraphs.map`, and wrap the list with `ChapterNavigation` when chapter view is enabled:

```tsx
  return (
    <div className="space-y-0">
      {chapterViewEnabled && chapterNodeIds.length > 1 && activeChapterIndex !== undefined && onChapterNavigate && (
        <ChapterNavigation
          currentIndex={activeChapterIndex}
          totalChapters={totalChapters}
          currentTitle={chapterHeadings?.[activeChapterIndex]?.title ?? `Chapter ${activeChapterIndex + 1}`}
          onPrev={() => onChapterNavigate(activeChapterIndex - 1)}
          onNext={() => onChapterNavigate(activeChapterIndex + 1)}
        />
      )}
      {visibleParagraphs.map((p, i) => {
        // ... existing paragraph rendering logic unchanged ...
      })}
      {chapterViewEnabled && chapterNodeIds.length > 1 && activeChapterIndex !== undefined && onChapterNavigate && (
        <div className="pt-4">
          <ChapterNavigation
            currentIndex={activeChapterIndex}
            totalChapters={totalChapters}
            currentTitle={chapterHeadings?.[activeChapterIndex]?.title ?? `Chapter ${activeChapterIndex + 1}`}
            onPrev={() => onChapterNavigate(activeChapterIndex - 1)}
            onNext={() => onChapterNavigate(activeChapterIndex + 1)}
          />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
```

**Important:** The existing `paragraphs.map` callback body stays identical — just change the variable name from `paragraphs` to `visibleParagraphs` in the `.map()` call.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: Build succeeds. StoryCanvas now accepts optional chapter view props.

- [ ] **Step 4: Commit**

```bash
git add src/components/story/StoryCanvas.tsx
git commit -m "feat: add chapter-at-a-time view mode to StoryCanvas"
```

---

## Task 6: Wire Chapter View Into StoryWrite Page

**Files:**
- Modify: `src/pages/StoryWrite.tsx` (state, props, desktop toggle)
- Modify: `src/components/story/StoryWriteDesktopShell.tsx` (accept toggle prop)

- [ ] **Step 1: Add chapter view state to StoryWrite.tsx**

Near the other `useState` declarations (around line 195), add:

```typescript
  const [chapterViewEnabled, setChapterViewEnabled] = useState(isMobile);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
```

Add a `useEffect` to keep `chapterViewEnabled` in sync if `isMobile` changes:

```typescript
  useEffect(() => {
    setChapterViewEnabled(isMobile);
  }, [isMobile]);
```

Add a `useEffect` to auto-navigate to the latest chapter when new content is generated:

```typescript
  useEffect(() => {
    if (chapterViewEnabled && chapterNodes.length > 0) {
      setActiveChapterIndex(chapterNodes.length - 1);
    }
  }, [chapterNodes.length, chapterViewEnabled]);
```

- [ ] **Step 2: Update handleChapterClick to work with chapter view**

Replace the existing `handleChapterClick` (line 1338-1343):

Old:
```typescript
  const handleChapterClick = (id: string) => {
    const el = document.getElementById(`para-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
```

New:
```typescript
  const handleChapterClick = (id: string) => {
    if (chapterViewEnabled) {
      const idx = chapterNodes.findIndex((n) => n.id === id);
      if (idx !== -1) setActiveChapterIndex(idx);
    } else {
      const el = document.getElementById(`para-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };
```

- [ ] **Step 3: Pass chapter view props to StoryCanvas**

In the `content` JSX block, update the `<StoryCanvas>` usage (around line 1811):

Add the new props:
```tsx
      <StoryCanvas
        paragraphs={paragraphs}
        onEdit={handleEdit}
        chapterHeadings={chapterHeadings}
        onInsertBreak={handleInsertBreak}
        onRenameChapter={!isMobile || chapterEditMode ? handleChapterRename : undefined}
        chapterEditMode={isMobile ? chapterEditMode : chapterEditMode ? true : undefined}
        pendingBreakKey={pendingBreakKey}
        breakTargetNodeIds={chapterEditMode && isMobile ? breakTargetNodeIds : undefined}
        chapterViewEnabled={chapterViewEnabled}
        activeChapterIndex={activeChapterIndex}
        onChapterNavigate={setActiveChapterIndex}
      />
```

- [ ] **Step 4: Add focus mode toggle to the desktop header**

Import `Focus` (or use `BookOpen` which is already imported) at the top. In the desktop header section (around line 1700-1753), add a toggle button. Find the area where other header action buttons are rendered and add:

```tsx
          {!isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setChapterViewEnabled((prev) => !prev)}
                  className={`rounded-lg p-2 transition-colors ${
                    chapterViewEnabled
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={chapterViewEnabled ? "Switch to scroll view" : "Switch to chapter focus view"}
                >
                  <BookOpen className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{chapterViewEnabled ? "Scroll view" : "Focus view"}</TooltipContent>
            </Tooltip>
          ) : null}
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: Build succeeds. Mobile defaults to chapter view, desktop has a toggle.

- [ ] **Step 6: Commit**

```bash
git add src/pages/StoryWrite.tsx src/components/story/StoryWriteDesktopShell.tsx
git commit -m "feat: wire chapter-at-a-time view into StoryWrite page"
```

---

## Task 7: Paragraph Action Bar Component

**Files:**
- Create: `src/components/story/ParagraphActionBar.tsx`

- [ ] **Step 1: Create the ParagraphActionBar component**

```tsx
// src/components/story/ParagraphActionBar.tsx
import { Pencil, Sparkles } from "lucide-react";

interface ParagraphActionBarProps {
  onEdit: () => void;
  onRewrite: () => void;
}

export function ParagraphActionBar({ onEdit, onRewrite }: ParagraphActionBarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card shadow-sm px-1 py-0.5 animate-fade-in">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title="Edit manually"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <div className="h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onRewrite}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        title="Rewrite with AI"
      >
        <Sparkles className="h-3 w-3" />
        Rewrite
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/story/ParagraphActionBar.tsx
git commit -m "feat: add ParagraphActionBar component"
```

---

## Task 8: Rewrite Input Component

**Files:**
- Create: `src/components/story/RewriteInput.tsx`

- [ ] **Step 1: Create the RewriteInput component**

```tsx
// src/components/story/RewriteInput.tsx
import { useState, useRef, useEffect } from "react";
import { Send, Check, Undo2, Loader2 } from "lucide-react";

interface RewriteInputProps {
  onSubmit: (instruction: string) => void;
  onAccept: () => void;
  onRevert: () => void;
  onCancel: () => void;
  isStreaming: boolean;
  hasResult: boolean;
}

export function RewriteInput({
  onSubmit,
  onAccept,
  onRevert,
  onCancel,
  isStreaming,
  hasResult,
}: RewriteInputProps) {
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = instruction.trim();
    if (trimmed.length < 3) return;
    onSubmit(trimmed);
  };

  if (hasResult && !isStreaming) {
    return (
      <div className="flex items-center gap-2 py-2 animate-fade-in">
        <button
          type="button"
          onClick={onAccept}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Check className="h-3 w-3" />
          Accept
        </button>
        <button
          type="button"
          onClick={onRevert}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Undo2 className="h-3 w-3" />
          Revert
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 animate-fade-in">
      <input
        ref={inputRef}
        type="text"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="How should this be rewritten?"
        disabled={isStreaming}
        className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isStreaming || instruction.trim().length < 3}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isStreaming ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/story/RewriteInput.tsx
git commit -m "feat: add RewriteInput component for AI paragraph rewrite"
```

---

## Task 9: Rewrite API Client

**Files:**
- Create: `src/lib/rewrite-api.ts`

- [ ] **Step 1: Create the streaming rewrite client function**

```typescript
// src/lib/rewrite-api.ts
import { supabase } from "@/integrations/supabase/client";

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

export async function streamRewrite({
  paragraphText,
  instruction,
  tone,
  genre,
  premise,
  surroundingContext,
  onDelta,
  onDone,
  onError,
}: {
  paragraphText: string;
  instruction: string;
  tone?: string;
  genre?: string;
  premise?: string;
  surroundingContext: { before: string; after: string };
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}) {
  try {
    const accessToken = await getAccessToken();
    const resp = await fetch("/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ paragraphText, instruction, tone, genre, premise, surroundingContext }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Rewrite failed" }));
      onError(err.error || "Rewrite failed");
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/rewrite-api.ts
git commit -m "feat: add streaming rewrite API client"
```

---

## Task 10: Rewrite Paragraph API Endpoint

**Files:**
- Create: `api/rewrite-paragraph.ts`

- [ ] **Step 1: Create the rewrite-paragraph Edge endpoint**

```typescript
// api/rewrite-paragraph.ts
import { getAuthenticatedUser, getUserTier, unauthorizedResponse } from "./_lib/auth.js";
import { getToneDirective } from "../src/lib/tone-profiles.js";
import { PROSE_CRAFT_RULES } from "./_lib/prose-rules.js";

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  try {
    const user = await getAuthenticatedUser(req.headers.get("authorization"));
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { paragraphText, instruction, tone, genre, premise, surroundingContext } = body;

    if (!paragraphText || !instruction) {
      return new Response(
        JSON.stringify({ error: "paragraphText and instruction are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI rewrite failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("rewrite-paragraph error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add api/rewrite-paragraph.ts
git commit -m "feat: add rewrite-paragraph streaming API endpoint"
```

---

## Task 11: Integrate Action Bar and Rewrite into ParagraphBlock

**Files:**
- Modify: `src/components/story/StoryCanvas.tsx:199-270` (ParagraphBlock)

- [ ] **Step 1: Add imports to StoryCanvas.tsx**

At the top of `StoryCanvas.tsx`, add:

```typescript
import { ParagraphActionBar } from "@/components/story/ParagraphActionBar";
import { RewriteInput } from "@/components/story/RewriteInput";
```

- [ ] **Step 2: Add rewrite props to StoryCanvasProps and ParagraphBlock**

Add to `StoryCanvasProps`:
```typescript
  onRewrite?: (id: string, instruction: string) => void;
  rewritingParagraphId?: string | null;
  rewriteStreamedText?: string;
  rewriteHasResult?: boolean;
  onRewriteAccept?: () => void;
  onRewriteRevert?: () => void;
  onRewriteCancel?: () => void;
```

Pass these through to each `ParagraphBlock`:
```tsx
            <ParagraphBlock
              paragraph={p}
              isFirst={i === 0}
              isChapterStart={showHeading}
              onEdit={isEditable ? onEdit : undefined}
              onRewrite={onRewrite}
              rewritingId={rewritingParagraphId}
              rewriteStreamedText={rewriteStreamedText}
              rewriteHasResult={rewriteHasResult}
              onRewriteAccept={onRewriteAccept}
              onRewriteRevert={onRewriteRevert}
              onRewriteCancel={onRewriteCancel}
            />
```

- [ ] **Step 3: Rewrite the ParagraphBlock component with action bar**

Replace the `ParagraphBlock` function (lines 199-270) with:

```tsx
function ParagraphBlock({
  paragraph,
  isFirst,
  isChapterStart,
  onEdit,
  onRewrite,
  rewritingId,
  rewriteStreamedText,
  rewriteHasResult,
  onRewriteAccept,
  onRewriteRevert,
  onRewriteCancel,
}: {
  paragraph: StoryParagraph;
  isFirst: boolean;
  isChapterStart?: boolean;
  onEdit?: (id: string, newText: string) => void;
  onRewrite?: (id: string, instruction: string) => void;
  rewritingId?: string | null;
  rewriteStreamedText?: string;
  rewriteHasResult?: boolean;
  onRewriteAccept?: () => void;
  onRewriteRevert?: () => void;
  onRewriteCancel?: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "action" | "editing" | "rewriting">("idle");
  const [editText, setEditText] = useState(paragraph.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isThisRewriting = rewritingId === paragraph.id;

  useEffect(() => {
    if (!isThisRewriting && mode === "rewriting") setMode("idle");
  }, [isThisRewriting, mode]);

  useEffect(() => {
    if (mode !== "editing") setEditText(paragraph.text);
  }, [paragraph.text, mode]);

  useEffect(() => {
    if (mode === "editing" && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [mode]);

  const handleSave = () => {
    if (editText.trim() !== paragraph.text && onEdit) {
      onEdit(paragraph.id, editText.trim());
    }
    setMode("idle");
  };

  const handleClick = () => {
    if (mode === "idle" && (onEdit || onRewrite)) {
      setMode("action");
    }
  };

  const displayText = isThisRewriting && rewriteStreamedText !== undefined
    ? rewriteStreamedText
    : paragraph.text;

  if (mode === "editing") {
    return (
      <div className="relative group">
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setEditText(paragraph.text); setMode("idle"); }
          }}
          className="w-full font-story text-lg leading-[1.85] text-story-text bg-primary/[0.03] rounded-lg p-3 -m-3 border border-primary/20 resize-none focus:outline-none focus:border-primary/40 overflow-wrap-break-word"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {mode === "action" && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10">
          <ParagraphActionBar
            onEdit={() => setMode("editing")}
            onRewrite={() => {
              setMode("rewriting");
              // The actual instruction will come from RewriteInput
            }}
          />
        </div>
      )}
      <p
        onClick={handleClick}
        onBlur={() => { if (mode === "action") setMode("idle"); }}
        tabIndex={mode === "action" ? 0 : undefined}
        className={`font-story text-lg leading-[1.85] text-story-text transition-colors duration-200 py-2 ${
          onEdit || onRewrite ? "cursor-text hover:bg-primary/[0.02] rounded-lg px-1 -mx-1" : ""
        } ${(isFirst || isChapterStart) ? "first-letter:text-4xl first-letter:font-semibold first-letter:float-left first-letter:mr-1.5 first-letter:leading-[1] first-letter:text-primary" : ""} ${
          paragraph.isStreaming ? "animate-fade-in" : ""
        } ${isThisRewriting ? "bg-primary/[0.04] rounded-lg px-1 -mx-1" : ""} ${
          mode === "action" ? "bg-primary/[0.03] rounded-lg px-1 -mx-1 ring-1 ring-primary/20" : ""
        }`}
        style={{ overflowWrap: "break-word" }}
      >
        {displayText}
        {(paragraph.isStreaming || (isThisRewriting && !rewriteHasResult)) && (
          <span className="inline-block w-0.5 h-5 bg-primary ml-0.5 animate-pulse-gentle align-text-bottom" />
        )}
      </p>
      {mode === "rewriting" && onRewrite && (
        <RewriteInput
          onSubmit={(instruction) => onRewrite(paragraph.id, instruction)}
          onAccept={() => { onRewriteAccept?.(); setMode("idle"); }}
          onRevert={() => { onRewriteRevert?.(); setMode("idle"); }}
          onCancel={() => { onRewriteCancel?.(); setMode("idle"); }}
          isStreaming={isThisRewriting && !rewriteHasResult && rewriteStreamedText !== undefined}
          hasResult={isThisRewriting && !!rewriteHasResult}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/story/StoryCanvas.tsx
git commit -m "feat: integrate action bar and AI rewrite into ParagraphBlock"
```

---

## Task 12: Wire Rewrite Into StoryWrite Page

**Files:**
- Modify: `src/pages/StoryWrite.tsx`

- [ ] **Step 1: Add rewrite imports and state**

Add the import near the top of StoryWrite.tsx:
```typescript
import { streamRewrite } from "@/lib/rewrite-api";
```

Near the other `useState` declarations, add:
```typescript
  const [rewritingParagraphId, setRewritingParagraphId] = useState<string | null>(null);
  const [rewriteStreamedText, setRewriteStreamedText] = useState<string>("");
  const [rewriteOriginalText, setRewriteOriginalText] = useState<string>("");
  const [rewriteHasResult, setRewriteHasResult] = useState(false);
```

- [ ] **Step 2: Add rewrite handler**

Add the handler function near the other handler functions (after `handleEdit`):

```typescript
  const handleRewrite = (paragraphId: string, instruction: string) => {
    const paragraph = paragraphs.find((p) => p.id === paragraphId);
    if (!paragraph) return;

    // Gather surrounding context (2-3 paragraphs before and after)
    const paraIndex = paragraphs.findIndex((p) => p.id === paragraphId);
    const before = paragraphs.slice(Math.max(0, paraIndex - 3), paraIndex).map((p) => p.text).join("\n\n");
    const after = paragraphs.slice(paraIndex + 1, paraIndex + 4).map((p) => p.text).join("\n\n");

    setRewritingParagraphId(paragraphId);
    setRewriteOriginalText(paragraph.text);
    setRewriteStreamedText("");
    setRewriteHasResult(false);

    streamRewrite({
      paragraphText: paragraph.text,
      instruction,
      tone: storyMeta.tone,
      genre: storyMeta.genre,
      premise: storyMeta.premise,
      surroundingContext: { before, after },
      onDelta: (delta) => {
        setRewriteStreamedText((prev) => prev + delta);
      },
      onDone: (fullText) => {
        setRewriteStreamedText(fullText);
        setRewriteHasResult(true);
      },
      onError: (error) => {
        toast.error(error);
        setRewritingParagraphId(null);
        setRewriteStreamedText("");
        setRewriteHasResult(false);
      },
    });
  };

  const handleRewriteAccept = () => {
    if (!rewritingParagraphId || !rewriteStreamedText) return;

    // Update the paragraph text
    const paraId = rewritingParagraphId;
    const newText = rewriteStreamedText.trim();

    // Update in paragraph state
    setParagraphs((prev) => prev.map((p) => (p.id === paraId ? { ...p, text: newText } : p)));

    // Persist to DB: update the node's text field
    const nodeId = paraId.includes("-") ? paraId.substring(0, paraId.lastIndexOf("-")) : paraId;
    const paraIndexStr = paraId.includes("-") ? paraId.substring(paraId.lastIndexOf("-") + 1) : "0";
    const paraIndex = parseInt(paraIndexStr, 10);

    // Rebuild the full node text from current paragraphs
    const nodeParas = paragraphs
      .filter((p) => {
        const nid = p.id.includes("-") ? p.id.substring(0, p.id.lastIndexOf("-")) : p.id;
        return nid === nodeId;
      })
      .map((p) => {
        const pid = p.id.includes("-") ? p.id.substring(p.id.lastIndexOf("-") + 1) : "0";
        return pid === String(paraIndex) ? newText : p.text;
      });

    apiClient.updateNode(nodeId, { text: nodeParas.join("\n\n") });

    setIsDesyncced(true);
    setRewritingParagraphId(null);
    setRewriteStreamedText("");
    setRewriteOriginalText("");
    setRewriteHasResult(false);
  };

  const handleRewriteRevert = () => {
    setRewritingParagraphId(null);
    setRewriteStreamedText("");
    setRewriteOriginalText("");
    setRewriteHasResult(false);
  };
```

- [ ] **Step 3: Pass rewrite props to StoryCanvas**

Update the `<StoryCanvas>` JSX to include the rewrite props:

```tsx
      <StoryCanvas
        paragraphs={paragraphs}
        onEdit={handleEdit}
        chapterHeadings={chapterHeadings}
        onInsertBreak={handleInsertBreak}
        onRenameChapter={!isMobile || chapterEditMode ? handleChapterRename : undefined}
        chapterEditMode={isMobile ? chapterEditMode : chapterEditMode ? true : undefined}
        pendingBreakKey={pendingBreakKey}
        breakTargetNodeIds={chapterEditMode && isMobile ? breakTargetNodeIds : undefined}
        chapterViewEnabled={chapterViewEnabled}
        activeChapterIndex={activeChapterIndex}
        onChapterNavigate={setActiveChapterIndex}
        onRewrite={handleRewrite}
        rewritingParagraphId={rewritingParagraphId}
        rewriteStreamedText={rewriteStreamedText}
        rewriteHasResult={rewriteHasResult}
        onRewriteAccept={handleRewriteAccept}
        onRewriteRevert={handleRewriteRevert}
        onRewriteCancel={handleRewriteRevert}
      />
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/StoryWrite.tsx
git commit -m "feat: wire AI paragraph rewrite into StoryWrite page"
```

---

## Task 13: Final Build Verification and Integration Test

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: All existing tests pass.

- [ ] **Step 4: Manual smoke test checklist**

Start the dev server with `vercel dev` and verify:

1. **Brief preset**: Click a choice → select "Brief" length → verify generated text is ~50 words
2. **Prose quality**: Generate several sections → verify prose is natural, names aren't over-repeated, no word fixation
3. **Mobile chapter view**: Open story on mobile viewport → verify chapter-at-a-time view with prev/next navigation
4. **Desktop focus toggle**: Click the BookOpen icon in desktop header → verify toggle between scroll and focus modes
5. **Paragraph action bar**: Click a paragraph → verify Edit/Rewrite buttons appear
6. **AI rewrite**: Click Rewrite → enter instruction → verify streamed rewrite → Accept/Revert work correctly
7. **Chapter list navigation**: Tap chapter in sidebar/sheet → verify it navigates to correct chapter in focus view

- [ ] **Step 5: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix: address smoke test issues"
```

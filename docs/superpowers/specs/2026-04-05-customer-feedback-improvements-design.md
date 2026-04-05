# Customer Feedback Improvements — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Approach:** Ship all changes at once (Approach A)

---

## Overview

Six customer feedback items addressed in one release, spanning AI prose quality, text length options, chapter navigation, and inline AI rewriting.

| # | Feedback | Category |
|---|----------|----------|
| 1 | Chapter-level editing on phone, mode toggle on desktop | UI |
| 2 | Click-to-edit AI rewrite of specific paragraphs | UI + API |
| 3 | Prose too flowery / overly poetic | Prompt engineering |
| 4 | Repeats full character names unnecessarily | Prompt engineering |
| 5 | AI fixates on words, disrupts reading flow | Prompt engineering |
| 6 | Short text still too long for some users | Preset + UI |

---

## 1. AI Prompt Improvements (Items 3, 4, 5)

### Changes to `api/generate-section.ts` system prompt

**Updated opening line** (replaces current "You are a master storyteller and prose writer. Write rich, immersive narrative prose."):

> You are a master storyteller and prose writer. Write rich, immersive narrative prose with the craft and instincts of a seasoned novelist.

**Three new rules added to the RULES section:**

**Prose naturalness (item 3):**
> Write like a seasoned novelist — match prose intensity to the moment. Descriptive or figurative language should feel earned by the scene, not applied uniformly. Some sentences should be plain and functional, serving the plot. Maintain a coherent voice across the entire section; don't let each paragraph become its own stylistic showcase.

**Name usage (item 4):**
> Handle character names the way published fiction does. Introduce with full name, then naturally shift to first name, pronouns, or contextual descriptors ("the detective", "her brother"). Only return to full name when there's genuine narrative reason — after a long absence, a formal moment, or to distinguish between characters. This is basic craft; trust your instinct as a writer.

**Word variety (item 5):**
> Avoid reusing the same distinctive word or phrase within a short span. Trust your instincts as a novelist — natural variety means picking a different angle, not the most exotic synonym. Plain repetition of common words (said, the, was) is fine.

### Scope

- Applied globally in the `generate-section` system prompt, across all tones.
- Existing tone profiles (dark & gritty, poetic & dreamlike, etc.) continue to layer on top via `getToneDirective()`.
- No changes to `generate-choices` or `summarize` prompts.

---

## 2. Brief Length Preset (Item 6)

### Backend (`api/generate-section.ts`)

New entry in `LENGTH_PRESETS`:

```typescript
brief: { paragraphs: "1 short paragraph (~50 words)", maxTokens: 250 }
```

Full lineup:

| Preset | Words | Max Tokens | Paragraphs |
|--------|-------|------------|------------|
| brief  | ~50   | 250        | 1 short paragraph |
| short  | ~100  | 500        | 1-2 paragraphs |
| medium | ~250  | 1200       | 2-3 paragraphs |
| long   | ~500  | 2500       | 4-6 paragraphs |
| epic   | ~1000 | 4000       | 8-10 paragraphs |

### Frontend (`src/components/story/ChoiceCards.tsx`)

New option at the start of `LENGTH_OPTIONS`:

```typescript
{ value: "brief", label: "Brief", desc: "~50w" }
```

### Default

Default length remains **"medium"**. Brief is opt-in.

---

## 3. Chapter-at-a-Time View (Item 1)

### Mobile (default behavior)

The story canvas on mobile switches from showing all paragraphs to showing **one chapter at a time**.

**Navigation:**
- Previous/Next buttons at the top and bottom of the chapter content
- Existing "Chapters" tab in mobile bottom nav opens the chapter list sheet — tapping a chapter jumps to it in the focused view
- Chapter indicator in the header area (e.g. "Chapter 3 of 7")

**Choice cards:** Only appear when the user is on the latest chapter and scrolls to the bottom. Earlier chapters show read-only content (no choice cards).

### Desktop (opt-in toggle)

A toggle button in the editor toolbar/header area that switches between:
- **Scroll mode** (default): full story canvas, all chapters visible — current behavior
- **Focus mode**: chapter-at-a-time, same behavior as mobile

Toggle persists per session (local state, not saved to DB).

### Implementation

**Components affected:**
- `StoryCanvas.tsx` — add `chapterView` mode that filters displayed paragraphs to the active chapter index
- New `ChapterNavigation` component — prev/next buttons + "Chapter X of Y" indicator
- `StoryWriteMobileShell` — defaults to `chapterView: true`
- `StoryWriteDesktopShell` — defaults to `chapterView: false`, adds focus mode toggle in header
- Chapter list interactions (sidebar on desktop, sheet on mobile) — tapping a chapter sets the active chapter index

**What stays the same:**
- Paragraph editing, chapter breaks, streaming, drop caps all work identically within a chapter
- Chapter sidebar on desktop unchanged
- Story data model unchanged — purely a view-layer concern
- Choice cards behavior unchanged (just only shown on the latest chapter)

---

## 4. AI Paragraph Rewrite (Item 2)

### Interaction Flow

1. User taps/clicks a paragraph → a small **action bar** appears above the paragraph with two buttons: **Edit** (pencil icon) and **Rewrite** (sparkle/wand icon)
2. **Edit** → enters current manual edit mode (textarea, same as today)
3. **Rewrite** → expands an inline text input below the action bar with placeholder "How should this be rewritten?" and a Submit button
4. User types instruction (e.g. "make this more tense", "shorter", "remove the inner monologue")
5. AI streams the rewritten paragraph in-place, replacing the original text. Subtle highlight/shimmer indicates AI-generated content.
6. After streaming completes: **Accept** / **Revert** buttons. Accept saves to DB, Revert restores original text.

### New API Endpoint: `api/rewrite-paragraph.ts`

**Runtime:** Edge (streaming, same pattern as `generate-section`)

**Inputs:**
- `paragraphText` — the paragraph to rewrite
- `instruction` — user's rewrite direction
- `tone` — story tone setting
- `genre` — story genre
- `premise` — original story premise
- `surroundingContext` — 2-3 paragraphs before and after for coherence

**System prompt:**

> You are a seasoned novelist revising a single paragraph in a larger work. Rewrite ONLY the paragraph provided, following the user's instruction. Your rewrite must:
> - Match the voice, tone, and style of the surrounding text exactly
> - Preserve all plot details, character names, and facts unless the instruction explicitly asks to change them
> - Read as a seamless part of the larger narrative — no seams, no tonal shifts
> - Be approximately the same length unless the instruction implies otherwise

The endpoint also receives the story's tone directive (via `getToneDirective()`) and genre, appended to the system prompt the same way `generate-section` does. The prose quality rules from Section 1 (naturalness, name usage, word variety) also apply to rewrites — they should be shared as a common prompt fragment used by both `generate-section` and `rewrite-paragraph`.

**User message format:**

```
SURROUNDING CONTEXT (before):
{preceding paragraphs}

PARAGRAPH TO REWRITE:
{paragraphText}

SURROUNDING CONTEXT (after):
{following paragraphs}

INSTRUCTION: {user's instruction}
```

### Frontend Changes

**`StoryCanvas.tsx` / `ParagraphBlock` component:**
- Click/tap no longer immediately enters edit mode
- Instead shows the action bar (Edit / Rewrite)
- New `RewriteInput` inline component for the instruction field
- New `RewritePreview` state: shows streamed text with Accept/Revert controls

**Mobile considerations:**
- Action bar buttons minimum 44px tap targets
- Instruction input uses full viewport width
- Accept/Revert buttons prominent and spaced apart to avoid accidental taps

### Limitations (by design)

- Single paragraph at a time — no multi-paragraph selection
- Always user-initiated with an explicit instruction — no automatic suggestions
- No rewrite history — once accepted, the original is replaced (node text updated in Supabase via paragraph index)

### Saving Rewrites

When the user accepts a rewrite:
1. Identify which node the paragraph belongs to (from the `nodeId-index` paragraph ID)
2. Split the node's full text into paragraphs
3. Replace the target paragraph at the given index
4. Rejoin and update the node's `text` field in Supabase

---

## Non-Goals

- No changes to `generate-choices` or `summarize` API routes
- No changes to story data model or database schema
- No rewrite history or undo beyond the immediate Accept/Revert
- No multi-paragraph AI rewrite
- No changes to existing tone profiles (the new prompt rules apply globally)
- No persistent storage of view mode preference (focus/scroll toggle is session-only)

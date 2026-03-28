# Mobile Story Experience & Assisted Chaptering — Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Goal:** Fix the mobile story-writing experience without degrading desktop, and make chapter definition meaningfully better through a hybrid system of manual controls plus passive AI review.

---

## Problems Being Solved

1. **The story screen breaks down on phones.** `StoryWrite` currently keeps a fixed left sidebar beside a capped reading column, which squeezes the prose and wastes horizontal space on small screens.
2. **Key chapter interactions depend on hover.** The chapter split affordance in `StoryCanvas`, chapter row menus in `ChapterSidebar`, and timeline secondary actions do not translate well to touch.
3. **Chapter definition is too manual and too hidden.** Users can split, rename, merge, and delete chapters, but the system does very little to help them decide where chapters should begin.
4. **The current experience is structurally correct but not editorially helpful.** Chapters are represented in data, but the product does not guide users toward strong chapter boundaries, titles, or review timing.

## Success Criteria

- Desktop story writing remains functionally and visually familiar above the mobile breakpoint.
- Mobile users get a full-width, touch-first writing experience.
- Chapters and timeline remain available on mobile, but no longer consume permanent screen width.
- Chapter assistance stays passive and opt-in.
- AI suggestions improve chapter definition without silently restructuring the story.

## Non-Goals

- Replacing the branching node model with a standalone chapter model.
- Automatic chapter edits during normal generation.
- Reviewing inactive branches in v1.
- Reworking dashboard, landing, or non-story pages.
- Persisting cross-device chapter-review state in v1.

---

## Design

### 1. Responsive Story Screen Architecture

`StoryWrite` should render two layout shells:

- **Desktop (`>= 768px`)** keeps the current structure: persistent left sidebar, centered story column, existing header actions, and current reading width.
- **Mobile (`< 768px`)** uses a story-first shell with no persistent sidebar.

The breakpoint should follow the existing `useIsMobile()` hook in `src/hooks/use-mobile.tsx`.

The mobile shell consists of:

- a compact top bar with back navigation, story title, and minimal primary actions
- a full-width story canvas with reduced side padding
- a sticky bottom utility bar with `Write`, `Structure`, and `Tools`
- a bottom `Sheet` for `Structure`
- a second bottom `Sheet` for `Tools`

This is a deliberate layout fork, not a single compromised responsive layout. The desktop shell should not inherit the mobile bottom bar, and the mobile shell should not keep the desktop sidebar.

### 2. Mobile Structure Access

On mobile, `Structure` opens a bottom sheet built from the existing `src/components/ui/sheet.tsx` primitive. Inside that sheet, the app uses the existing `src/components/ui/tabs.tsx` primitive for:

- `Chapters`
- `Timeline`

This matches the product decision that chapters are the primary structural tool, while timeline is secondary and mainly used for reverting or forking.

The `Chapters` tab contains:

- the passive chapter-review prompt area
- the chapter list
- chapter row actions
- the entry point into manual chapter-edit mode

The `Timeline` tab contains:

- the current active path and inactive branches
- tap-to-jump rows
- an explicit touch-safe secondary action for `Fork here`

No mobile behavior should rely on hover.

### 3. Touch-Safe Chapter Management

The current hover-only split affordance inside `StoryCanvas` should be replaced on mobile with an explicit **chapter edit mode**.

**Chapter edit mode behavior:**

- Entered from `Structure > Chapters` via an `Edit chapters` action.
- While active, the story canvas shows visible insertion markers between paragraphs and explicit actions on chapter headings.
- The user can tap a marker to start a new chapter at that paragraph boundary.
- The mode shows a clear `Done` control so the interface can return to normal reading/writing.

**Manual actions preserved in v1:**

- rename chapter
- split chapter at paragraph boundary
- merge chapter with previous
- delete chapter subtree

Desktop may keep its existing hover-driven affordances, but mobile must use explicit controls. Chapter and timeline rows on mobile should use a permanent touch-safe `More` trigger rather than hover-revealed secondary actions.

### 4. Assisted Chapter Review

Chapter assistance should follow a **hybrid** model:

- the user remains in control of actual chapter structure
- AI periodically reviews the recent active path
- the review stays passive
- AI suggestions are applied only after explicit user approval

#### Review Scope

AI review only considers:

- the current active branch
- recent unresolved writing near the current tip
- existing recent chapter starts and titles

AI review does **not**:

- rewrite older confirmed chapters by default
- inspect inactive branches in v1
- silently split nodes or rename chapters
- interrupt writing with a modal or forced step

#### Suggestion Types in v1

- `start_new_chapter_here`
- `rename_recent_chapter`

`merge_recent_chapters` is deferred. It is useful, but it introduces more product complexity and is less important than getting split and rename right.

#### Passive Prompt Behavior

The story canvas shows a quiet prompt such as `Review chapter structure` or `Chapter review available`. It should feel informative, not urgent.

The prompt does not need to render full suggestions inline. Its job is to:

- let the user know that a review is available
- open `Structure > Chapters`
- trigger suggestion generation if suggestions have not yet been fetched for the current branch tip

If suggestions have already been generated in the current session, the prompt may optionally show a count.

### 5. Review Timing and Eligibility

The review system should not fire on every turn.

**Baseline rule:**

- do not surface a review prompt until at least **4 new active turns** have been added since the last chapter review checkpoint

**Earlier review is allowed when:**

- at least **3 new active turns** have been added, and
- either the story arc phase changed, or the current chapter has grown unusually long

For v1, “unusually long” should mean roughly **1,400+ words** since the latest chapter start.

**Cooldown rule:**

- if a review generates no useful suggestions, suppress the prompt until **2 more active turns** are added
- dismissing a prompt should also suppress it until more progress is made

This keeps the system periodic without making it feel naggy. It also matches the desired product behavior: start looking after 4-5 turns, but allow earlier or later review depending on how much actually changed.

### 6. Suggestion Generation and Application

Chapter suggestions should use a dedicated API route:

`POST /api/generate-chapter-suggestions`

The route receives a focused payload derived from the active path, including:

- recent active nodes
- recent chapter starts and titles
- recent text grouped by node/paragraph
- story premise, genre, tone, summary, and story state
- current beat/phase from the existing story-arc system

The route returns at most **2 suggestions** per review. Each suggestion includes:

- `type`: `start_new_chapter_here` or `rename_recent_chapter`
- `anchorNodeId`
- `anchorParagraphIndex` when needed for a split
- `proposedTitle` when applicable
- `reason`

The AI is advisory. The mutation path remains deterministic:

- split suggestions apply through the existing `splitNodeAtPosition`
- rename suggestions apply through the existing `updateNodeChapterTitle`

This keeps structural edits inside the existing, tested data model instead of inventing a second chapter system.

### 7. State, Staleness, and Storage

V1 should avoid new database tables for chapter suggestions.

Instead:

- prompt eligibility and cooldown state live in `StoryWrite`
- a lightweight per-story review checkpoint is stored in `sessionStorage`
- fetched suggestions are cached in component state for the current active tip

This state should include enough information to answer:

- when was the last review shown
- when was it dismissed
- which active tip the current suggestions belong to

Suggestions become stale when:

- the active tip changes
- the user jumps to another node
- a suggestion is applied
- new writing changes the anchored paragraph positions

When stale, suggestions are discarded silently and regenerated only when the user reopens review after eligibility is reached again.

This keeps v1 implementation smaller and safer. Cross-device persistence can be added later if the feature proves useful.

### 8. Components and Boundaries

The existing components remain the base, but responsibilities should be split more clearly.

Expected additions:

- `StoryWriteMobileShell` or equivalent mobile-only layout component
- `StoryWriteDesktopShell` or equivalent wrapper for the current desktop layout
- `MobileStoryBar`
- `StoryStructureSheet`
- `ChapterReviewPrompt`
- `ChapterEditModeBar` or equivalent edit-mode controller

Existing components to adapt:

- `src/pages/StoryWrite.tsx`
- `src/components/story/StoryCanvas.tsx`
- `src/components/story/ChapterSidebar.tsx`
- `src/components/story/StoryTimeline.tsx`

The chapter logic should remain anchored in the existing story-node APIs rather than spreading mutation logic across new UI components.

### 9. Error Handling

- If chapter suggestion generation fails, writing continues normally and the prompt can fall back to `Review unavailable right now`.
- If a suggestion becomes stale before application, the apply action should fail gracefully and ask the user to reopen chapter review.
- If a split or rename mutation fails, the UI should keep the user in the chapter review flow and show a clear toast error.
- Mobile sheets must close predictably after successful actions and remain open on failure when the user still needs context.

### 10. Testing

The implementation should cover:

- mobile vs desktop layout branching in `StoryWrite`
- desktop regression checks proving the current sidebar-first layout remains intact
- mobile `Structure` sheet and tab behavior
- chapter edit mode visibility and split-marker interaction
- passive review prompt eligibility and cooldown rules
- chapter suggestion rendering, stale invalidation, and apply/dismiss flows
- touch-safe timeline actions on mobile
- continued use of existing split/rename APIs

E2E coverage should prioritize the phone-sized story-writing flow, because that is where the current experience is weakest.

---

## Summary

The product direction is:

- keep desktop intact
- rebuild the story screen for phones around the prose instead of the sidebar
- move structure into a bottom sheet with tabs
- improve manual chapter editing with an explicit edit mode
- add passive AI chapter review that helps define chapters without taking control away from the user

This solves the mobile usability problem and the chapter-definition problem together, while staying compatible with the current node-based story model.

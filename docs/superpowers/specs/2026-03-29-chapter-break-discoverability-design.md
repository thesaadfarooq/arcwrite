# Chapter Break Discoverability & Chapter Suggestions Clarity - Design Spec

**Date:** 2026-03-29
**Status:** Draft
**Goal:** Make manual chapter creation obvious and user-controlled on desktop and mobile, while reframing AI chapter suggestions as optional secondary help rather than the primary chapter workflow.

---

## Problems Being Solved

1. Manual chapter creation is too hidden. Desktop relies too much on hover discovery, and mobile depends on structure/edit flows that are easy to miss.
2. The current suggestion prompt is misleading. Phrasing like `Review chapter structure` and `Review when convenient` sounds like an audit task rather than a chaptering tool.
3. Break placement feels backward. Users expect a chapter break to be inserted after a paragraph they just wrote, not before it.
4. AI appears to control chaptering. Users can feel blocked from adding a break when no suggestion is present, even though manual tools technically exist.
5. Mobile chapter instructions are hard to read and easy to overlook.

## Success Criteria

- Users can find `Add chapter break` without relying on hover or prior knowledge.
- Manual chapter controls are always available even when AI suggestions are absent.
- Break placement is clearly explained as happening after the selected paragraph.
- Desktop and mobile share the same core mental model for chapter creation.
- AI suggestion wording makes it clear that suggestions may include breaks or titles, but remain optional.

## Non-Goals

- Replacing the current node-splitting chapter model.
- Letting AI automatically apply chapter edits.
- Expanding chapter AI beyond recent active-path suggestions in this track.
- Solving opening regeneration, tone fidelity, name variety, or turn-limit clarity in this spec.

---

## Design

### 1. Manual Chapter Breaks Become a First-Class Writing Action

`StoryWrite` should expose a visible `Add chapter break` action near the main writing/choice area instead of treating chapter creation as a sidebar-only or hover-only affordance.

When selected:

- the story enters a temporary `chapter break mode`
- a compact mode bar explains: `Choose where the new chapter should begin. Breaks are inserted after the paragraph you select.`
- visible break markers appear after paragraphs
- marker copy says `Start new chapter after this paragraph`
- selecting a marker inserts the break, exits the mode, refreshes chapter state, and leaves rename/title actions available

The existing hover marker may remain as a desktop fallback, but it should no longer be the primary discoverability path.

### 2. Scope the Picker to the Current Chapter First

Chapter break mode should default to the current chapter only.

That keeps the screen readable while matching the most common intent: users usually want to split the section they are actively writing. The mode bar should include a secondary action such as `Show earlier chapters` for cases where the user wants to split older material.

This produces a layered interaction:

- default: quick, local chapter split
- expanded: older active-path content can also be targeted

The app should not force users into the `Structure` panel just to add a break at the current point in the story.

### 3. Reframe Chapters as User Controls First

The `Chapters` surface should present manual control as the primary purpose of the area.

At the top of the chapter panel:

- `Add chapter break`
- `Edit chapter titles`
- existing row-level actions such as rename, merge, and delete

Below that, AI suggestions appear in a separate section. This makes it visually and conceptually clear that chapter management belongs to the user, while AI suggestions are optional assistance.

Manual controls must remain visible regardless of whether suggestions exist.

### 4. Rename the Suggestion Surface Around Real Actions

The passive prompt and the chapter panel should stop using “review” language.

Prompt wording:

- idle title: `Chapter suggestions ready`
- idle body: `Suggestions may include chapter breaks or better titles for recent chapters.`
- idle button: `See suggestions`

Loading wording:

- title: `Preparing chapter suggestions`
- body: `Looking at recent story beats and chapter titles.`
- button: `Loading...`

Suggestion cards should keep explicit labels:

- `Start new chapter`
- `Rename chapter`

This language aligns the UI with what the system actually does and avoids the mistaken idea that the user is being asked to review the story manually.

### 5. Mobile and Desktop Should Share the Same Chaptering Model

Both platforms should expose the same core workflow:

1. click or tap `Add chapter break`
2. enter chapter break mode
3. pick a position after a paragraph
4. apply the break
5. optionally rename the resulting chapter

The surfaces can differ by layout, but not by mental model.

Desktop:

- `Add chapter break` appears near the writing/choice area
- chapter panel still offers the same manual controls and AI suggestions

Mobile:

- `Add chapter break` also appears in the main writing flow
- users should not need to open `Structure` first just to find chapter creation
- any supporting instructions in the structure sheet must remain fully readable and non-overlapping

### 6. Error Handling and Feedback

Chapter break mode should feel explicit and responsive.

- Entering the mode shows a clear banner and a `Cancel` action.
- Applying a break shows a pending state on the selected marker.
- If the position becomes stale, show a specific message such as `That chapter break is no longer valid. Review the structure and try again.`
- AI suggestion loading must visibly indicate that work is in progress.

The system should not silently fail or collapse back into a generic error state.

### 7. Implementation Boundaries

This track should stay focused on UI/state orchestration and copy clarity.

Expected code impact:

- [src/pages/StoryWrite.tsx](/home/saad/Documents/Arcwrite/arcwrite/src/pages/StoryWrite.tsx)
  - first-class `Add chapter break` action
  - chapter break mode orchestration
  - current-chapter / older-content scope toggle
- [src/components/story/StoryCanvas.tsx](/home/saad/Documents/Arcwrite/arcwrite/src/components/story/StoryCanvas.tsx)
  - after-paragraph marker wording
  - scoped marker rendering in break mode
- [src/components/story/ChapterSidebar.tsx](/home/saad/Documents/Arcwrite/arcwrite/src/components/story/ChapterSidebar.tsx)
  - manual controls section above suggestions
- [src/components/story/ChapterReviewPrompt.tsx](/home/saad/Documents/Arcwrite/arcwrite/src/components/story/ChapterReviewPrompt.tsx)
  - new prompt wording and loading copy
- mobile structure components
  - instruction/readability cleanup

This work should reuse the existing split-node API and chapter suggestion route rather than introducing a new backend model.

### 8. Testing Scope

Add or update regression coverage for:

- visible `Add chapter break` action on desktop
- visible `Add chapter break` action on mobile
- chapter break mode instructions and cancel path
- after-paragraph marker wording
- current-chapter-first scoping, with explicit reveal of older content
- chapter panel showing manual controls independently of AI suggestions
- removal of `Review when convenient` copy
- pending and stale-position handling continuing to work correctly

---

## Recommendation

Implement the story-first hybrid model:

- manual chapter creation is a first-class action in the writing flow
- `Chapters` becomes the clear home of manual structure controls
- AI suggestions remain available, but are framed as secondary, optional help

This solves the PM feedback without requiring a chapter-system rewrite, and it gives both desktop and mobile users an obvious, coherent chaptering workflow.

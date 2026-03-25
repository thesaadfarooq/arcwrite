# Phase 3 Activation Polish — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Problem

Arcwrite's SEO foundation work is largely in place, but the path from visitor to first story is still thin. The landing page exposes only a narrow entry path, the empty dashboard does little to guide a new user, story creation still depends heavily on a blank premise field, and shared story pages do not strongly convert readers into creators.

## Goal

Improve activation without major architectural changes by surfacing existing start modes, adding lightweight starter prompts, and turning shared story pages into stronger acquisition surfaces.

## Decisions

- Keep this phase additive. No SSR, no new data model, no backend workflow changes.
- Reuse the existing `/story/new` flow and its `mode` query param support.
- Implement starter templates as curated prompt presets in the frontend, not a stored template system.
- Improve the shared story page with stronger CTAs and copy, but do not build remix/fork mechanics.

## Scope

### 1. Landing Page Entry Points

**File:** `src/pages/Index.tsx`

Add two more creation entry points alongside the existing "Start writing" CTA:

- `Pick a genre`
- `Surprise me`

These should route into the existing story creation flow:

- authenticated users: `/story/new?mode=genre` and `/story/new?mode=surprise`
- unauthenticated users: `/auth`

The goal is to expose already-supported modes instead of forcing every user through the blank-premise flow.

### 2. Empty Dashboard Onboarding

**File:** `src/pages/Dashboard.tsx`

Replace the single empty-state CTA with a three-option quick start area:

- Write from scratch
- Pick a genre
- Surprise me

This is only for the empty state. The existing dashboard structure, story grid/list, and plan-limit behavior stay unchanged.

### 3. Story Creation Starter Prompts

**File:** `src/pages/StoryNew.tsx`

Add lightweight prompt presets that help users start without inventing a premise from scratch.

Behavior:

- On the premise step, show a small set of curated starter prompts.
- Clicking a prompt fills the premise textarea.
- When a genre is selected, show genre-specific prompt suggestions tailored to that genre.
- Do not create user-saved templates, editing tools, or a template CMS.

This keeps the implementation low-risk while directly addressing blank-page friction.

### 4. Shared Story Conversion Polish

**File:** `src/pages/SharedStory.tsx`

Keep the reading experience intact, but add a real conversion section after the story.

Behavior:

- Add a short CTA block under the story copy.
- Add a primary action: `Create your own story`
- Add a secondary action:
  - `Start a [genre] story` when `story.genre` exists
  - `Surprise me` otherwise
- Add a few lines of product copy connecting the reading experience to creating with Arcwrite.
- Improve the error state so it offers a creation path, not just a return-home path.

Out of scope:

- no accountless editor
- no story remix/fork feature
- no new share analytics system
- no new share database model

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add more visible start-mode entry points |
| `src/pages/Dashboard.tsx` | Improve empty-state onboarding CTAs |
| `src/pages/StoryNew.tsx` | Add curated starter prompt UI |
| `src/pages/SharedStory.tsx` | Add conversion CTA section and stronger error-state actions |
| `src/lib/story-starters.ts` | New shared starter data and helper logic |
| `src/test/phase3-activation.test.ts` | Tests for activation helper behavior |

## Out of Scope

- `/examples` page
- SSR, prerendering, or routing changes
- Full template library with persistence
- No-login sample story editor
- Shared-story remix/fork implementation
- Mobile editor refactor

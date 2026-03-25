# Phase 3 Activation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve activation by surfacing more story-start paths, adding lightweight starter prompts, and converting shared-story readers into creators.

**Architecture:** Keep the existing Vite SPA and route structure. Introduce a small shared starter-data module, wire it into the landing page, dashboard, story creation flow, and shared story page, and verify behavior with focused tests.

**Tech Stack:** React 18, react-router-dom v6, TypeScript, Vitest, Testing Library

---

### Task 1: Add shared activation data and tests

**Files:**
- Create: `src/lib/story-starters.ts`
- Create: `src/test/phase3-activation.test.ts`

- [ ] **Step 1: Write failing tests for starter data**
- [ ] **Step 2: Run `npm test -- src/test/phase3-activation.test.ts` and confirm failure**
- [ ] **Step 3: Add shared starter prompt and CTA helper data**
- [ ] **Step 4: Run `npm test -- src/test/phase3-activation.test.ts` and confirm pass**

### Task 2: Expose multiple start modes on landing and empty dashboard

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Use: `src/lib/story-starters.ts`

- [ ] **Step 1: Add landing-page quick-start entry points for scratch, genre, and surprise**
- [ ] **Step 2: Add empty-dashboard quick-start entry points for scratch, genre, and surprise**
- [ ] **Step 3: Run targeted tests and a build check**

### Task 3: Add starter prompts to story creation

**Files:**
- Modify: `src/pages/StoryNew.tsx`
- Use: `src/lib/story-starters.ts`

- [ ] **Step 1: Show curated prompt cards on the premise step**
- [ ] **Step 2: Show genre-specific prompt suggestions when a genre is selected**
- [ ] **Step 3: Ensure clicking a prompt prefills the premise input**
- [ ] **Step 4: Run targeted tests and a build check**

### Task 4: Improve shared-story conversion

**Files:**
- Modify: `src/pages/SharedStory.tsx`
- Use: `src/lib/story-starters.ts`

- [ ] **Step 1: Add conversion CTA section below the shared story**
- [ ] **Step 2: Add stronger error-state actions**
- [ ] **Step 3: Use genre-aware secondary CTA when possible**
- [ ] **Step 4: Run targeted tests and a build check**

### Task 5: Verification

**Files:**
- Verify only

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Run `npm run build`**
- [ ] **Step 3: Review changed files for scope compliance**

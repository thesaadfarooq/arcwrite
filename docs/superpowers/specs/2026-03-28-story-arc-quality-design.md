# Story Arc & Quality Improvements — Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Goal:** Give stories a narrative arc with pacing, varied section endings, adaptive choices, and a proper ending mechanism. Also add custom tone input and story length selection.

---

## Problems Being Solved

1. **No story arc** — stories have no sense of pacing, structure, or progression toward a climax/resolution. Every turn is generated identically regardless of narrative position.
2. **Cliffhanger every section** — the current system prompt says "end at a natural decision point," which the AI interprets as dramatic tension every time. Sections never breathe, resolve, or reflect.
3. **No ending mechanism** — stories continue indefinitely until the user stops or hits a turn limit. There's no way to conclude a story with a satisfying resolution.
4. **No custom tone input** — the creation page only offers 6 preset tones with no free-text option.
5. **Static choice types** — every turn generates the same 4 types (safe/risky/emotional/chaotic) regardless of where the story is narratively.

## Non-Goals

- Context loss / summary quality improvements (deferred — not a current pain point)
- AI model changes or provider migration
- Changes to the branching/tree structure of story nodes
- Changes to the story sharing or export features

---

## Design

### 1. Beat System (Deterministic Arc Calculator)

A pure function that maps `(currentTurn, targetTurns)` to a narrative phase. No AI call — just math.

**Five phases with proportional allocation:**

| Phase | % of story | Purpose |
|-------|-----------|---------|
| `setup` | 0-15% | Establish world, characters, initial situation |
| `rising` | 15-50% | Develop conflict, complications, raise stakes |
| `climax` | 50-70% | Peak tension, major confrontation or revelation |
| `falling` | 70-85% | Consequences, resolve secondary threads |
| `resolution` | 85-100% | Wrap up, deliver ending, final moment |

**Function signature:**

```typescript
type NarrativePhase = "setup" | "rising" | "climax" | "falling" | "resolution";

interface BeatInfo {
  phase: NarrativePhase;
  progress: number;        // 0-1, position within the overall story
  phaseProgress: number;   // 0-1, position within the current phase
  turnsRemaining: number;
  isNearEnd: boolean;      // true when in falling or resolution
}

function calculateBeat(currentTurn: number, targetTurns: number): BeatInfo;
```

**Scaling:** The percentages are proportional, so a 15-turn story compresses all phases and a 45-turn story stretches them. The function uses `currentTurn / targetTurns` as the primary input.

**Stories can exceed target:** The target is a guide, not a hard limit. If a user is on turn 40 of a 35-turn story, the beat stays at `resolution` until the story ends. The arc doesn't restart or break.

**Location:** `src/lib/story-arc.ts` — new file, used by the frontend. The frontend computes the beat info and passes it to the API routes (`generate-section`, `generate-choices`) in the request body. The API routes do not import this file — they receive the beat as a trusted parameter and use it to select prompt variations.

### 2. Per-Beat Prompt Variations

The `generate-section` API route builds a different pacing instruction based on the current beat. This replaces the current static instruction: "End at a natural decision point where the reader could choose what happens next."

**Setup:**
> You are in the opening of this story. Establish the world and characters with vivid detail, ground the reader in the setting, and plant the seeds of the central conflict. End this section at a natural pause — not a cliffhanger. Let the reader settle into the world before things start moving.

**Rising:**
> The story is building momentum. Develop complications, deepen character relationships, and raise the stakes. Vary your section endings — sometimes build tension, sometimes end with a quiet character moment or a surprising revelation. Not every section needs a cliffhanger.

**Climax:**
> The story is approaching its peak. Escalate the central conflict toward confrontation or revelation. This is where the biggest, most consequential moments happen. End with impact — this is where cliffhangers and dramatic beats feel earned.

**Falling:**
> The major conflict has peaked. Show the aftermath and consequences, resolve secondary threads, and let characters process what happened. The pace should feel like exhaling — purposeful but no longer frantic.

**Resolution:**
> Bring the story to a satisfying close. Tie up remaining threads, deliver a final emotional beat, and give the reader a sense of completion. This section should feel conclusive. No need to set up what's next — let the story land.

**Final turn (when user selects a "conclude" choice):**
> This is the final section of the story. Write a conclusive, satisfying ending. Resolve the central thread, give the protagonist a final moment, and close with an image or line that resonates. Do not set up further choices — this is the end.

**Implementation:** The beat info is passed from the frontend to `/api/generate-section` as a new `beat` parameter in the request body. The API route uses it to select the appropriate pacing instruction and inject it into the system prompt, replacing the current static "decision point" line.

### 3. Dynamic Choice Generation

The `generate-choices` API route receives the current beat and generates phase-appropriate choice types.

**Choice types per phase:**

| Phase | Types | Rationale |
|-------|-------|-----------|
| `setup` | `explore`, `connect`, `safe`, `foreshadow` | Build the world, meet characters, hint at what's coming |
| `rising` | `safe`, `risky`, `emotional`, `complicate` | Standard adventure choices with escalation |
| `climax` | `confront`, `risky`, `emotional`, `chaotic` | High-stakes, dramatic choices |
| `falling` | `resolve`, `emotional`, `explore`, `conclude` | Wind down, process, option to end |
| `resolution` | `resolve`, `emotional`, `conclude`, `epilogue` | Closing choices, multiple paths to ending |

**New choice type definitions:**

- `explore` — Investigate the world, a mystery, or a character's backstory
- `connect` — Build or test a relationship, alliance, or bond
- `foreshadow` — Stumble into or hint at something deeper beneath the surface
- `complicate` — Introduce a new obstacle, betrayal, or unexpected twist
- `confront` — Face the central conflict or antagonist directly
- `resolve` — Tie up a loose thread or make a decisive choice about an open question
- `conclude` — Begin wrapping up the entire story toward a final ending
- `epilogue` — A glimpse into the future after the main events

**The "conclude" choice:** When a user selects a choice of type `conclude` or `epilogue`, the system marks the story as entering its final section. The next `generate-section` call uses the "final turn" prompt. No choices are generated after this — the story ends.

**Always 4 choices per turn.** The number of choices stays at 4 — only the *types* change per phase.

**Implementation:** The beat is passed to `/api/generate-choices` as a new `beat` parameter. The choice type list for the current phase is included in the system prompt so the AI generates appropriate options. The OpenAI tool call schema must be updated: the hardcoded `enum: ["safe", "risky", "emotional", "chaotic"]` on the `type` property is replaced with a dynamic enum containing all possible types: `["safe", "risky", "emotional", "chaotic", "explore", "connect", "foreshadow", "complicate", "confront", "resolve", "conclude", "epilogue"]`. The system prompt tells the AI which 4 to use for the current phase.

### 4. "Begin Conclusion" Button

A UI control that lets the user manually fast-forward the arc to resolution.

**Visibility:** Appears in the ChoiceCards area when `beat.isNearEnd` is true (i.e., the story has entered the `falling` or `resolution` phase, which is ≥70% of target turns). Styled as a secondary/outline button below the 4 choice cards.

**Behavior when clicked:**
1. Set `arc_override = 'concluding'` on the `stories` table row via PATCH
2. The beat calculator checks `arc_override` — when `"concluding"`, it returns `falling` or `resolution` regardless of actual turn count
3. The following 1-2 turns use `resolution` beat
4. A `conclude` choice appears prominently in the generated options

**Not destructive:** The user can still select regular choices after clicking "Begin conclusion" — it shifts the arc but doesn't force an immediate end.

### 5. Custom Tone Input on Creation Page

**Current state:** StoryNew.tsx has 6 preset tone buttons, no custom option.

**Change:** Add a text input field below the preset grid:

```
[Dark & gritty] [Whimsical & light] [Literary & introspective]
[Fast-paced & cinematic] [Poetic & dreamlike] [Humorous & witty]

Or describe your own:
[___________________________________]
```

**Behavior:**
- Selecting a preset clears the custom input
- Typing in the custom input (3+ characters) deselects any preset
- The "Begin writing" button enables when either a preset is selected OR custom input has 3+ characters
- The value (preset or custom) is stored in the story's `tone` field as before

### 6. Story Length Selector on Creation Page

**New step** (or addition to the tone step) on the creation page:

```
How long should your story be?

[Short]    ~15 turns — A tight, focused tale
[Medium]   ~35 turns — A full narrative arc          (pre-selected)
[Long]     ~45+ turns — An epic journey
```

**Storage:** New `target_turns` column in the `stories` table:
- Type: `integer`, nullable
- Default: `35` (applied in the beat calculator when null)

**The value feeds directly into `calculateBeat()`** to determine phase boundaries for the entire story.

---

## Data Model Changes

### `stories` table — new columns (full list)

```sql
ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS arc_override text DEFAULT NULL;  -- 'concluding' when user clicks "Begin conclusion"
```

The `status` column already exists on the `stories` table (used by current code) — no migration needed for it. When a story completes, set `status = 'completed'`.

The `arc_override` column lives on `stories` (not in `story_state` JSON) because `story_state` is overwritten by the summarizer on every turn. Storing it in `story_state` would lose the override.

### `story_nodes` table — no schema changes

The beat info is computed at generation time from `currentTurn` and `targetTurns`. It doesn't need to be stored — it's derived.

**`currentTurn` definition:** The count of active nodes in the story's current path (`SELECT COUNT(*) FROM story_nodes WHERE story_id = $1 AND is_active = true`). In a branching story, only the active path counts — not all nodes in the tree.

---

## API Changes

### `POST /api/generate-section` — new request body field

```typescript
// Added to request body
beat: {
  phase: NarrativePhase;
  progress: number;
  isNearEnd: boolean;
  isFinalSection: boolean;  // true when user chose "conclude" choice
}
```

The API route uses `beat.phase` to select the pacing instruction and `beat.isFinalSection` to use the final-turn prompt.

**Default when `beat` is missing:** If the request body has no `beat` field (backward compatibility, opening section before any beat exists, or mid-deploy race condition), the API treats it as `{ phase: "setup", progress: 0, isNearEnd: false, isFinalSection: false }`. This means the current "decision point" pacing applies as a fallback — no crash, no silent failure.

### `POST /api/generate-choices` — new request body field

```typescript
// Added to request body
beat: {
  phase: NarrativePhase;
  progress: number;
}
```

The API route uses `beat.phase` to determine which choice types to generate. If `beat` is missing, defaults to `setup` phase types (`explore`, `connect`, `safe`, `foreshadow`).

### No new API routes needed.

---

## Frontend Changes

### StoryNew.tsx
- Add custom tone text input below preset buttons
- Add story length selector (Short 15 / Medium 35 / Long 45) after tone step
- Pass `target_turns` when creating the story via `createStory()`

### API + data layer changes for `target_turns`
- `api/db/stories.ts` POST handler: add `target_turns` to destructured body and INSERT query
- `api/db/stories.ts` PATCH handler: add `target_turns` and `arc_override` to `allowedFields`
- `src/lib/story-api.ts` `createStory()`: add `targetTurns` to the function signature, pass as `target_turns` in the payload

### StoryWrite.tsx
- Import and call `calculateBeat()` before each generation
- Pass beat info to `streamSection()` and `generateChoices()`
- Show "Begin conclusion" button after climax phase
- When user selects a `conclude`/`epilogue` choice, mark `isFinalSection: true` on the next generation
- After final section is generated, don't call `generateChoices()` — show a "Story complete" state instead

### ChoiceCards.tsx
- Update the `StoryChoice` TypeScript interface: widen `type` from `"safe" | "risky" | "emotional" | "chaotic"` to include all new types: `"explore" | "connect" | "foreshadow" | "complicate" | "confront" | "resolve" | "conclude" | "epilogue"`. This type is exported and used in `story-api.ts`.
- Handle new choice types (different icons/colors for explore, connect, confront, resolve, conclude, epilogue, etc.)
- Show "Begin conclusion" button when `beat.isNearEnd` is true
- Show "Story complete" state when story has ended

---

## What "Story Complete" Looks Like

When a story ends (via conclude choice or final resolution turn):
- No choice cards are generated
- The story canvas shows the final section
- Below it, a simple card: "Story complete" with options to:
  - Share the story
  - Export as HTML
  - Go back to dashboard
  - Continue anyway (override — generates new choices and extends the story)

The "Continue anyway" escape hatch ensures the arc system never hard-blocks the user.

---

## Testing Approach

- Unit tests for `calculateBeat()` — verify phase boundaries at different target lengths
- Unit tests for prompt selection — verify correct pacing instruction per phase
- Unit tests for choice type selection — verify correct types per phase
- Integration test: generate a story for 5+ turns and verify beat progression
- Manual playtesting: run through Short/Medium/Long stories and check that pacing feels right

---

## Rollout

Ship as a single release. No feature flags needed — the changes are additive (new prompt logic, new UI controls) and don't break existing stories. Existing stories without `target_turns` default to 35.

### Migration execution

1. **Database migration** — Run the ALTER TABLE statements against the production Postgres instance on the DO Droplet before deploying code:
   ```sql
   ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;
   ALTER TABLE stories ADD COLUMN IF NOT EXISTS arc_override text DEFAULT NULL;
   ```
   These are additive (ADD COLUMN with defaults) and safe to run while the app is live — existing queries ignore unknown columns. `IF NOT EXISTS` prevents failures if run more than once. Note: the `status` column already exists on the `stories` table — no migration needed for it.

2. **Code deploy** — Push all code changes to `main`. Vercel auto-deploys. The new columns are already present from step 1.

3. **Verification** — Create a new story with each length preset (Short/Medium/Long), play through several turns, verify beat progression in browser devtools (log the beat info), test "Begin conclusion" button, test custom tone input.

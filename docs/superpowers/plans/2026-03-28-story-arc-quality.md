# Story Arc & Quality Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrative arc system that gives stories pacing, varied section endings, adaptive choices, a conclusion mechanism, custom tone input, and story length selection.

**Architecture:** A pure `calculateBeat()` function maps turn position to narrative phase. The frontend computes beat info and passes it to API routes, which use it to select phase-appropriate prompt variations and choice types. No new API routes — existing ones gain a `beat` parameter.

**Tech Stack:** React 18, TypeScript, Vitest, Tailwind CSS, shadcn/ui, OpenAI API (gpt-5.4-mini/nano), Postgres (DigitalOcean)

**Spec:** `docs/superpowers/specs/2026-03-28-story-arc-quality-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/story-arc.ts` | `calculateBeat()` pure function, types (`NarrativePhase`, `BeatInfo`), phase-to-choice-type mapping, pacing instruction strings |
| `src/test/story-arc.test.ts` | Unit tests for beat calculator, choice type mapping, pacing instructions |
| `src/components/story/StoryComplete.tsx` | "Story complete" card shown after final section |

### Modified files
| File | Changes |
|------|---------|
| `api/db/stories.ts` | Add `target_turns`, `arc_override` to POST destructure/INSERT and PATCH `allowedFields` |
| `api/generate-section.ts` | Accept `beat` param, replace static pacing line with per-phase instruction |
| `api/generate-choices.ts` | Accept `beat` param, update tool enum to all 12 types, inject phase types into system prompt |
| `src/lib/story-api.ts` | Add `targetTurns` to `createStory()`, add `beat` to `streamSection()` and `generateChoices()` |
| `src/lib/api-client.ts` | No changes needed — `createStory` already takes generic `Record<string, unknown>` payload |
| `src/components/story/ChoiceCards.tsx` | Widen `StoryChoice.type` union, add icons/colors for new types, add "Begin conclusion" button, add "Story complete" state |
| `src/pages/StoryNew.tsx` | Add custom tone text input, add story length selector, pass `target_turns` |
| `src/pages/StoryWrite.tsx` | Compute beat before each generation, pass beat to API calls, handle conclude/epilogue choices, show StoryComplete |

---

## Task 1: Database migration

**Files:**
- Modify: `api/db/stories.ts:50-66` (POST handler), `api/db/stories.ts:71` (PATCH allowedFields)

- [ ] **Step 1: Run the ALTER TABLE migration on the DO Droplet**

Connect to the production Postgres and run:

```sql
ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS arc_override text DEFAULT NULL;
```

Verify with: `\d stories` — should show both new columns.

- [ ] **Step 2: Update the stories POST handler to accept `target_turns`**

In `api/db/stories.ts`, update the POST handler. Change line 51:

```typescript
// Before:
const { title, genre, tone, premise, status } = req.body ?? {};

// After:
const { title, genre, tone, premise, status, target_turns } = req.body ?? {};
```

And the INSERT query (lines 52-63):

```typescript
const story = await queryOne(
  `INSERT INTO stories (user_id, title, genre, tone, premise, status, target_turns)
   VALUES ($1, $2, $3, $4, $5, $6, $7)
   RETURNING *`,
  [
    user.id,
    title || "Untitled Story",
    genre || null,
    tone || null,
    premise || null,
    status || "in_progress",
    target_turns ?? 35,
  ]
);
```

- [ ] **Step 3: Update the stories PATCH handler to allow `target_turns` and `arc_override`**

In `api/db/stories.ts` line 71, update `allowedFields`:

```typescript
const allowedFields = ["title", "genre", "tone", "premise", "status", "share_token", "target_turns", "arc_override"] as const;
```

- [ ] **Step 4: Commit**

```bash
git add api/db/stories.ts
git commit -m "$(cat <<'EOF'
feat: add target_turns and arc_override columns to stories table

Support story length selection and manual conclusion override for the
narrative arc system.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Beat calculator (`calculateBeat`)

**Files:**
- Create: `src/lib/story-arc.ts`
- Create: `src/test/story-arc.test.ts`

- [ ] **Step 1: Write failing tests for `calculateBeat`**

Create `src/test/story-arc.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateBeat, type BeatInfo, type NarrativePhase } from "@/lib/story-arc";

describe("calculateBeat", () => {
  // Phase boundary tests for a 20-turn story (easy math)
  const T = 20;

  it("returns setup at turn 1 (5%)", () => {
    const beat = calculateBeat(1, T);
    expect(beat.phase).toBe("setup");
    expect(beat.isNearEnd).toBe(false);
  });

  it("returns setup at turn 3 (15% boundary)", () => {
    const beat = calculateBeat(3, T);
    expect(beat.phase).toBe("setup");
  });

  it("returns rising at turn 4 (20%)", () => {
    const beat = calculateBeat(4, T);
    expect(beat.phase).toBe("rising");
  });

  it("returns rising at turn 10 (50% boundary)", () => {
    const beat = calculateBeat(10, T);
    expect(beat.phase).toBe("rising");
  });

  it("returns climax at turn 11 (55%)", () => {
    const beat = calculateBeat(11, T);
    expect(beat.phase).toBe("climax");
  });

  it("returns climax at turn 14 (70% boundary)", () => {
    const beat = calculateBeat(14, T);
    expect(beat.phase).toBe("climax");
  });

  it("returns falling at turn 15 (75%)", () => {
    const beat = calculateBeat(15, T);
    expect(beat.phase).toBe("falling");
    expect(beat.isNearEnd).toBe(true);
  });

  it("returns resolution at turn 18 (90%)", () => {
    const beat = calculateBeat(18, T);
    expect(beat.phase).toBe("resolution");
    expect(beat.isNearEnd).toBe(true);
  });

  it("clamps to resolution when story exceeds target", () => {
    const beat = calculateBeat(25, T);
    expect(beat.phase).toBe("resolution");
    expect(beat.progress).toBeGreaterThan(1);
    expect(beat.isNearEnd).toBe(true);
  });

  it("returns setup at turn 0 (opening)", () => {
    const beat = calculateBeat(0, T);
    expect(beat.phase).toBe("setup");
    expect(beat.progress).toBe(0);
  });

  it("computes progress as currentTurn / targetTurns", () => {
    const beat = calculateBeat(10, T);
    expect(beat.progress).toBeCloseTo(0.5);
  });

  it("computes turnsRemaining correctly", () => {
    const beat = calculateBeat(12, T);
    expect(beat.turnsRemaining).toBe(8);
  });

  it("turnsRemaining is 0 when past target", () => {
    const beat = calculateBeat(25, T);
    expect(beat.turnsRemaining).toBe(0);
  });

  it("computes phaseProgress within a phase", () => {
    // Rising goes from 15% to 50% (0.15-0.50 of 20 turns = turn 3..10)
    // Turn 7 is at 35%, which is (0.35-0.15)/(0.50-0.15) = ~0.57 of the rising phase
    const beat = calculateBeat(7, T);
    expect(beat.phase).toBe("rising");
    expect(beat.phaseProgress).toBeGreaterThan(0.5);
    expect(beat.phaseProgress).toBeLessThan(0.65);
  });

  // Scaling tests — different target lengths
  it("works for a short story (15 turns)", () => {
    expect(calculateBeat(1, 15).phase).toBe("setup");
    expect(calculateBeat(5, 15).phase).toBe("rising");
    expect(calculateBeat(10, 15).phase).toBe("climax");
    expect(calculateBeat(12, 15).phase).toBe("falling");
    expect(calculateBeat(14, 15).phase).toBe("resolution");
  });

  it("works for a long story (45 turns)", () => {
    expect(calculateBeat(3, 45).phase).toBe("setup");
    expect(calculateBeat(15, 45).phase).toBe("rising");
    expect(calculateBeat(25, 45).phase).toBe("climax");
    expect(calculateBeat(35, 45).phase).toBe("falling");
    expect(calculateBeat(40, 45).phase).toBe("resolution");
  });

  it("defaults targetTurns to 35 when 0 or negative", () => {
    const beat = calculateBeat(5, 0);
    expect(beat.phase).toBe("setup");
    expect(beat.turnsRemaining).toBe(30);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- src/test/story-arc.test.ts`
Expected: FAIL — module `@/lib/story-arc` does not exist.

- [ ] **Step 3: Implement `calculateBeat`**

Create `src/lib/story-arc.ts`:

```typescript
export type NarrativePhase = "setup" | "rising" | "climax" | "falling" | "resolution";

export interface BeatInfo {
  phase: NarrativePhase;
  progress: number;
  phaseProgress: number;
  turnsRemaining: number;
  isNearEnd: boolean;
}

const PHASE_BOUNDARIES: { phase: NarrativePhase; start: number; end: number }[] = [
  { phase: "setup",      start: 0,    end: 0.15 },
  { phase: "rising",     start: 0.15, end: 0.50 },
  { phase: "climax",     start: 0.50, end: 0.70 },
  { phase: "falling",    start: 0.70, end: 0.85 },
  { phase: "resolution", start: 0.85, end: 1.0  },
];

export function calculateBeat(currentTurn: number, targetTurns: number): BeatInfo {
  const effective = targetTurns > 0 ? targetTurns : 35;
  const progress = currentTurn / effective;
  const turnsRemaining = Math.max(0, effective - currentTurn);

  // Find current phase — last phase whose start we've passed
  let matched = PHASE_BOUNDARIES[PHASE_BOUNDARIES.length - 1];
  for (const boundary of PHASE_BOUNDARIES) {
    if (progress < boundary.end) {
      matched = boundary;
      break;
    }
  }

  const phaseLength = matched.end - matched.start;
  const phaseProgress = phaseLength > 0
    ? Math.min(1, Math.max(0, (progress - matched.start) / phaseLength))
    : 1;

  return {
    phase: matched.phase,
    progress,
    phaseProgress,
    turnsRemaining,
    isNearEnd: matched.phase === "falling" || matched.phase === "resolution",
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- src/test/story-arc.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/story-arc.ts src/test/story-arc.test.ts
git commit -m "$(cat <<'EOF'
feat: add calculateBeat() narrative arc calculator

Pure function mapping (currentTurn, targetTurns) to narrative phase.
Five phases: setup, rising, climax, falling, resolution with proportional
boundaries. Includes comprehensive unit tests.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Pacing instructions and choice type maps

**Files:**
- Modify: `src/lib/story-arc.ts`
- Modify: `src/test/story-arc.test.ts`

- [ ] **Step 1: Write failing tests for pacing instructions and choice types**

Append to `src/test/story-arc.test.ts`:

```typescript
import { getPacingInstruction, getChoiceTypesForPhase, ALL_CHOICE_TYPES } from "@/lib/story-arc";

describe("getPacingInstruction", () => {
  it("returns setup instruction for setup phase", () => {
    const instruction = getPacingInstruction("setup", false);
    expect(instruction).toContain("opening of this story");
    expect(instruction).toContain("not a cliffhanger");
  });

  it("returns rising instruction for rising phase", () => {
    const instruction = getPacingInstruction("rising", false);
    expect(instruction).toContain("building momentum");
  });

  it("returns climax instruction for climax phase", () => {
    const instruction = getPacingInstruction("climax", false);
    expect(instruction).toContain("peak");
  });

  it("returns falling instruction for falling phase", () => {
    const instruction = getPacingInstruction("falling", false);
    expect(instruction).toContain("aftermath");
  });

  it("returns resolution instruction for resolution phase", () => {
    const instruction = getPacingInstruction("resolution", false);
    expect(instruction).toContain("satisfying close");
  });

  it("returns final turn instruction when isFinalSection is true", () => {
    const instruction = getPacingInstruction("resolution", true);
    expect(instruction).toContain("final section of the story");
    expect(instruction).toContain("Do not set up further choices");
  });

  it("final turn instruction overrides any phase", () => {
    const instruction = getPacingInstruction("rising", true);
    expect(instruction).toContain("final section of the story");
  });
});

describe("getChoiceTypesForPhase", () => {
  it("returns setup types", () => {
    expect(getChoiceTypesForPhase("setup")).toEqual(["explore", "connect", "safe", "foreshadow"]);
  });

  it("returns rising types", () => {
    expect(getChoiceTypesForPhase("rising")).toEqual(["safe", "risky", "emotional", "complicate"]);
  });

  it("returns climax types", () => {
    expect(getChoiceTypesForPhase("climax")).toEqual(["confront", "risky", "emotional", "chaotic"]);
  });

  it("returns falling types", () => {
    expect(getChoiceTypesForPhase("falling")).toEqual(["resolve", "emotional", "explore", "conclude"]);
  });

  it("returns resolution types", () => {
    expect(getChoiceTypesForPhase("resolution")).toEqual(["resolve", "emotional", "conclude", "epilogue"]);
  });

  it("always returns exactly 4 types", () => {
    const phases: NarrativePhase[] = ["setup", "rising", "climax", "falling", "resolution"];
    for (const phase of phases) {
      expect(getChoiceTypesForPhase(phase)).toHaveLength(4);
    }
  });
});

describe("ALL_CHOICE_TYPES", () => {
  it("contains all 12 choice types", () => {
    expect(ALL_CHOICE_TYPES).toHaveLength(12);
    expect(ALL_CHOICE_TYPES).toContain("safe");
    expect(ALL_CHOICE_TYPES).toContain("conclude");
    expect(ALL_CHOICE_TYPES).toContain("epilogue");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/test/story-arc.test.ts`
Expected: FAIL — `getPacingInstruction` and `getChoiceTypesForPhase` not exported.

- [ ] **Step 3: Implement pacing instructions and choice type maps**

Add to `src/lib/story-arc.ts`:

```typescript
export type ChoiceType =
  | "safe" | "risky" | "emotional" | "chaotic"
  | "explore" | "connect" | "foreshadow" | "complicate"
  | "confront" | "resolve" | "conclude" | "epilogue";

export const ALL_CHOICE_TYPES: ChoiceType[] = [
  "safe", "risky", "emotional", "chaotic",
  "explore", "connect", "foreshadow", "complicate",
  "confront", "resolve", "conclude", "epilogue",
];

const PACING_INSTRUCTIONS: Record<NarrativePhase, string> = {
  setup: "You are in the opening of this story. Establish the world and characters with vivid detail, ground the reader in the setting, and plant the seeds of the central conflict. End this section at a natural pause — not a cliffhanger. Let the reader settle into the world before things start moving.",
  rising: "The story is building momentum. Develop complications, deepen character relationships, and raise the stakes. Vary your section endings — sometimes build tension, sometimes end with a quiet character moment or a surprising revelation. Not every section needs a cliffhanger.",
  climax: "The story is approaching its peak. Escalate the central conflict toward confrontation or revelation. This is where the biggest, most consequential moments happen. End with impact — this is where cliffhangers and dramatic beats feel earned.",
  falling: "The major conflict has peaked. Show the aftermath and consequences, resolve secondary threads, and let characters process what happened. The pace should feel like exhaling — purposeful but no longer frantic.",
  resolution: "Bring the story to a satisfying close. Tie up remaining threads, deliver a final emotional beat, and give the reader a sense of completion. This section should feel conclusive. No need to set up what's next — let the story land.",
};

const FINAL_TURN_INSTRUCTION = "This is the final section of the story. Write a conclusive, satisfying ending. Resolve the central thread, give the protagonist a final moment, and close with an image or line that resonates. Do not set up further choices — this is the end.";

export function getPacingInstruction(phase: NarrativePhase, isFinalSection: boolean): string {
  if (isFinalSection) return FINAL_TURN_INSTRUCTION;
  return PACING_INSTRUCTIONS[phase];
}

const PHASE_CHOICE_TYPES: Record<NarrativePhase, ChoiceType[]> = {
  setup:      ["explore", "connect", "safe", "foreshadow"],
  rising:     ["safe", "risky", "emotional", "complicate"],
  climax:     ["confront", "risky", "emotional", "chaotic"],
  falling:    ["resolve", "emotional", "explore", "conclude"],
  resolution: ["resolve", "emotional", "conclude", "epilogue"],
};

export function getChoiceTypesForPhase(phase: NarrativePhase): ChoiceType[] {
  return PHASE_CHOICE_TYPES[phase];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/test/story-arc.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/story-arc.ts src/test/story-arc.test.ts
git commit -m "$(cat <<'EOF'
feat: add pacing instructions and choice type maps per phase

Phase-appropriate prompt text for generate-section and choice type
arrays for generate-choices. Both are consumed by the frontend and
passed to API routes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update `generate-section` API route

**Files:**
- Modify: `api/generate-section.ts:14,81-125`

- [ ] **Step 1: Add `beat` to request body destructure**

In `api/generate-section.ts` line 14, add `beat` to the destructured body:

```typescript
// Before:
const { premise, genre, tone, direction, summary, recentText, storyState, length } = await req.json();

// After:
const { premise, genre, tone, direction, summary, recentText, storyState, length, beat } = await req.json();
```

- [ ] **Step 2: Add `beat` to `buildSystemPrompt` options and replace static pacing line**

The current `buildSystemPrompt` uses a single destructured options object (line 81). Keep this pattern — just add `beat` as another property.

Update the function signature (line 81-97) to add `beat`:

```typescript
function buildSystemPrompt({
  tone, storyState, summary, recentText, premise, genre, paragraphInstruction,
  beat,
}: {
  tone?: string; storyState?: any; summary?: string; recentText?: string;
  premise?: string; genre?: string; paragraphInstruction: string;
  beat?: { phase?: string; isFinalSection?: boolean };
}) {
```

Inside the function, add the pacing logic **before** the prompt string construction (before line 98):

```typescript
  // Phase-aware pacing — replaces static "decision point" line
  const phasePrompts: Record<string, string> = {
    setup: "You are in the opening of this story. Establish the world and characters with vivid detail, ground the reader in the setting, and plant the seeds of the central conflict. End this section at a natural pause — not a cliffhanger. Let the reader settle into the world before things start moving.",
    rising: "The story is building momentum. Develop complications, deepen character relationships, and raise the stakes. Vary your section endings — sometimes build tension, sometimes end with a quiet character moment or a surprising revelation. Not every section needs a cliffhanger.",
    climax: "The story is approaching its peak. Escalate the central conflict toward confrontation or revelation. This is where the biggest, most consequential moments happen. End with impact — this is where cliffhangers and dramatic beats feel earned.",
    falling: "The major conflict has peaked. Show the aftermath and consequences, resolve secondary threads, and let characters process what happened. The pace should feel like exhaling — purposeful but no longer frantic.",
    resolution: "Bring the story to a satisfying close. Tie up remaining threads, deliver a final emotional beat, and give the reader a sense of completion. This section should feel conclusive. No need to set up what's next — let the story land.",
  };

  const finalTurnPrompt = "This is the final section of the story. Write a conclusive, satisfying ending. Resolve the central thread, give the protagonist a final moment, and close with an image or line that resonates. Do not set up further choices — this is the end.";

  const phase = beat?.phase || "setup";
  const pacingLine = beat?.isFinalSection
    ? finalTurnPrompt
    : (phasePrompts[phase] || "End at a natural decision point where the reader could choose what happens next.");
```

Then in the RULES block (line 104), replace the static line:
```
- End at a natural decision point where the reader could choose what happens next.
```
with:
```
- ${pacingLine}
```

**Note:** The pacing strings are duplicated here vs `src/lib/story-arc.ts` by design — API routes (edge runtime) cannot import frontend files. Keep both copies in sync when editing.

- [ ] **Step 3: Pass `beat` to `buildSystemPrompt` at the call site**

Update the call site (around line 28). Currently it passes `paragraphInstruction: preset.paragraphs`. Add `beat`:

```typescript
const systemPrompt = buildSystemPrompt({
  tone, storyState, summary, recentText, premise, genre,
  paragraphInstruction: preset.paragraphs,
  beat,
});
```

- [ ] **Step 4: Test manually**

Start the dev server (`npm run dev`), create a story, and verify:
- Opening section doesn't end on a cliffhanger (setup phase)
- Console log or network tab shows `beat` in the request body

- [ ] **Step 5: Commit**

```bash
git add api/generate-section.ts
git commit -m "$(cat <<'EOF'
feat: add per-phase pacing instructions to generate-section

Replace static "decision point" ending with phase-appropriate prompts.
Setup sections end at natural pauses, climax sections earn cliffhangers,
resolution sections feel conclusive. Falls back to setup when beat is missing.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Update `generate-choices` API route

**Files:**
- Modify: `api/generate-choices.ts:14,19-34,69`

- [ ] **Step 1: Add `beat` to request body destructure**

In `api/generate-choices.ts` line 14:

```typescript
// Before:
const { recentText, summary, storyState, tone, genre, premise } = await req.json();

// After:
const { recentText, summary, storyState, tone, genre, premise, beat } = await req.json();
```

- [ ] **Step 2: Build the phase-aware choice type list**

After the destructure, add:

```typescript
const allTypes = ["safe", "risky", "emotional", "chaotic", "explore", "connect", "foreshadow", "complicate", "confront", "resolve", "conclude", "epilogue"];

const phaseChoiceTypes: Record<string, string[]> = {
  setup:      ["explore", "connect", "safe", "foreshadow"],
  rising:     ["safe", "risky", "emotional", "complicate"],
  climax:     ["confront", "risky", "emotional", "chaotic"],
  falling:    ["resolve", "emotional", "explore", "conclude"],
  resolution: ["resolve", "emotional", "conclude", "epilogue"],
};

const phase = beat?.phase || "setup";
const activeTypes = phaseChoiceTypes[phase] || phaseChoiceTypes.setup;
```

- [ ] **Step 3: Update the system prompt to include phase-specific types**

Replace the current type instruction (lines 21-25) with:

```typescript
const typeDescriptions: Record<string, string> = {
  safe: "The expected, natural progression of the narrative",
  risky: "A surprising plot twist or unexpected turn",
  emotional: "A character-driven, emotionally resonant direction",
  chaotic: "A wild, unpredictable turn that shakes up everything",
  explore: "Investigate the world, a mystery, or a character's backstory",
  connect: "Build or test a relationship, alliance, or bond",
  foreshadow: "Stumble into or hint at something deeper beneath the surface",
  complicate: "Introduce a new obstacle, betrayal, or unexpected twist",
  confront: "Face the central conflict or antagonist directly",
  resolve: "Tie up a loose thread or make a decisive choice about an open question",
  conclude: "Begin wrapping up the entire story toward a final ending",
  epilogue: "A glimpse into the future after the main events",
};

const typeList = activeTypes.map(t => `- ${t}: ${typeDescriptions[t]}`).join("\n");

const systemPrompt = `You are a story direction advisor. Given the current state of a story, generate exactly 4 possible directions for what could happen next.

Each direction must be one of these types:
${typeList}

For each direction, provide:
- type: one of ${activeTypes.join(", ")}
- label: a short 4-8 word description
- preview: a 1-2 sentence preview of what would happen

${premise ? `ORIGINAL PREMISE: ${premise}\nChoices should be consistent with the premise's core concept and any established characters/settings. However, choices may introduce new characters, locations, or plot developments — the premise is a foundation, not a boundary. Never contradict what has already been established.` : ""}
${tone ? `TONE: ${tone}` : ""}
${genre ? `GENRE: ${genre}` : ""}`;
```

- [ ] **Step 4: Update the tool call enum to all 12 types**

Replace the hardcoded enum at line 69:

```typescript
// Before:
type: { type: "string", enum: ["safe", "risky", "emotional", "chaotic"] },

// After:
type: { type: "string", enum: allTypes },
```

- [ ] **Step 5: Test manually**

Create a story, advance several turns, check that:
- Choice types match the current phase
- Choices have correct type values in network response

- [ ] **Step 6: Commit**

```bash
git add api/generate-choices.ts
git commit -m "$(cat <<'EOF'
feat: add phase-aware dynamic choice types to generate-choices

Choice types now adapt per narrative phase (e.g., explore/connect in
setup, confront/chaotic in climax, conclude/epilogue in resolution).
Tool enum widened to all 12 types with phase-specific system prompt.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update `story-api.ts` client functions

**Files:**
- Modify: `src/lib/story-api.ts:13-75` (streamSection), `src/lib/story-api.ts:77-96` (generateChoices), `src/lib/story-api.ts:118-139` (createStory)

- [ ] **Step 1: Add `beat` param to `streamSection`**

In the `streamSection` function signature (line 13), add `beat` to the params:

```typescript
export async function streamSection({
  premise, genre, tone, direction, summary, recentText, storyState, length, beat,
  onDelta, onDone, onError,
}: {
  premise?: string; genre?: string; tone?: string; direction?: string;
  summary?: string; recentText?: string; storyState?: any; length?: SectionLength;
  beat?: { phase: string; progress: number; isNearEnd: boolean; isFinalSection: boolean };
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}) {
```

In the fetch body (around line 22), add `beat`:

```typescript
body: JSON.stringify({ premise, genre, tone, direction, summary, recentText, storyState, length, beat }),
```

- [ ] **Step 2: Add `beat` param to `generateChoices`**

In the `generateChoices` function signature (line 77):

```typescript
export async function generateChoices({
  recentText, summary, storyState, tone, genre, premise, beat,
}: {
  recentText: string; summary?: string; storyState?: any;
  tone?: string; genre?: string; premise?: string;
  beat?: { phase: string; progress: number };
}): Promise<StoryChoice[]> {
```

In the fetch body, add `beat`:

```typescript
body: JSON.stringify({ recentText, summary, storyState, tone, genre, premise, beat }),
```

- [ ] **Step 3: Add `targetTurns` to `createStory`**

In the `createStory` function signature (line 118):

```typescript
export async function createStory({
  title, genre, tone, premise, userId, targetTurns,
}: {
  title?: string;
  genre?: string;
  tone?: string;
  premise?: string;
  userId: string;
  targetTurns?: number;
}) {
  void userId;
  return apiClient.createStory({
    title: title || "Untitled Story",
    genre,
    tone,
    premise,
    status: "in_progress",
    target_turns: targetTurns ?? 35,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/story-api.ts
git commit -m "$(cat <<'EOF'
feat: add beat param to streamSection/generateChoices, targetTurns to createStory

Client-side API functions now pass narrative beat info to generation
endpoints and support target_turns for story length selection.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Update `ChoiceCards.tsx` — types, icons, conclude button

**Files:**
- Modify: `src/components/story/ChoiceCards.tsx`

- [ ] **Step 1: Widen the `StoryChoice` type union**

Replace the `StoryChoice` interface (line 8-12):

```typescript
export interface StoryChoice {
  type:
    | "safe" | "risky" | "emotional" | "chaotic"
    | "explore" | "connect" | "foreshadow" | "complicate"
    | "confront" | "resolve" | "conclude" | "epilogue";
  label: string;
  preview: string;
}
```

- [ ] **Step 2: Add icons and colors for new choice types**

Replace the `choiceConfig` (lines 32-37). Import new icons from lucide-react:

```typescript
import { Shield, Flame, Heart, Zap, Compass, Users, Eye, Puzzle, Swords, CheckCircle, BookOpen, Sparkles } from "lucide-react";

const choiceConfig: Record<string, { icon: any; color: string; label: string }> = {
  safe:        { icon: Shield,      color: "choice-safe",      label: "Expected" },
  risky:       { icon: Flame,       color: "choice-risky",     label: "Twist" },
  emotional:   { icon: Heart,       color: "choice-emotional", label: "Emotional" },
  chaotic:     { icon: Zap,         color: "choice-chaotic",   label: "Wildcard" },
  explore:     { icon: Compass,     color: "choice-safe",      label: "Explore" },
  connect:     { icon: Users,       color: "choice-emotional", label: "Connect" },
  foreshadow:  { icon: Eye,         color: "choice-risky",     label: "Foreshadow" },
  complicate:  { icon: Puzzle,      color: "choice-chaotic",   label: "Complicate" },
  confront:    { icon: Swords,      color: "choice-risky",     label: "Confront" },
  resolve:     { icon: CheckCircle, color: "choice-safe",      label: "Resolve" },
  conclude:    { icon: BookOpen,    color: "choice-emotional", label: "Conclude" },
  epilogue:    { icon: Sparkles,    color: "choice-safe",      label: "Epilogue" },
};
```

Update the config lookup to handle unknown types gracefully:

```typescript
const config = choiceConfig[choice.type] || choiceConfig.safe;
```

- [ ] **Step 3: Add `isNearEnd`, `onBeginConclusion`, and `isStoryComplete` props**

Update the `ChoiceCardsProps` interface:

```typescript
interface ChoiceCardsProps {
  choices: StoryChoice[];
  onSelect: (choice: StoryChoice | { type: "custom"; label: string; preview: string }) => void;
  onRegenerate: () => void;
  isLoading?: boolean;
  sectionLength: SectionLength;
  onSectionLengthChange: (length: SectionLength) => void;
  turnCount?: number;
  turnLimit?: number;
  isNearEnd?: boolean;
  onBeginConclusion?: () => void;
  isStoryComplete?: boolean;
}
```

- [ ] **Step 4: Add "Begin conclusion" button rendering**

After the choice cards grid (after the 4 animated cards), add:

```tsx
{isNearEnd && !isStoryComplete && onBeginConclusion && (
  <button
    onClick={onBeginConclusion}
    className="w-full mt-3 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
  >
    Begin wrapping up the story...
  </button>
)}
```

- [ ] **Step 5: Add "Story complete" state at the top of the component**

At the start of the render (before the choice cards), add:

```tsx
if (isStoryComplete) {
  return <StoryComplete />;
}
```

(The `StoryComplete` component is built in the next task.)

- [ ] **Step 6: Commit**

```bash
git add src/components/story/ChoiceCards.tsx
git commit -m "$(cat <<'EOF'
feat: add new choice types, icons, and begin-conclusion button to ChoiceCards

Widen StoryChoice type to 12 variants with phase-appropriate icons.
Add "Begin conclusion" outline button visible in falling/resolution.
Add isStoryComplete prop for story ending state.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Create `StoryComplete.tsx` component

**Files:**
- Create: `src/components/story/StoryComplete.tsx`

- [ ] **Step 1: Create the StoryComplete component**

Create `src/components/story/StoryComplete.tsx`:

```tsx
import { BookOpen, Share2, Download, LayoutDashboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StoryCompleteProps {
  onShare?: () => void;
  onExport?: () => void;
  onDashboard?: () => void;
  onContinue?: () => void;
}

export function StoryComplete({ onShare, onExport, onDashboard, onContinue }: StoryCompleteProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold font-story">Story Complete</h3>
          <p className="text-sm text-muted-foreground mt-1">Your story has reached its conclusion.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          )}
          {onDashboard && (
            <Button variant="outline" size="sm" onClick={onDashboard}>
              <LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          )}
        </div>
        {onContinue && (
          <button
            onClick={onContinue}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            <RotateCcw className="h-3 w-3 inline mr-1" />
            Continue anyway
          </button>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/story/StoryComplete.tsx
git commit -m "$(cat <<'EOF'
feat: add StoryComplete component for story ending state

Shows "Story complete" card with share, export, dashboard, and
continue-anyway options.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Integrate beat system into `StoryWrite.tsx`

**Files:**
- Modify: `src/pages/StoryWrite.tsx`

This is the largest task — it wires everything together. The key changes:

1. Import `calculateBeat` and compute beat before each generation
2. Pass beat to `streamSection()` and `generateChoices()`
3. Track `arc_override` and `isStoryComplete` state
4. Handle conclude/epilogue choice selection
5. Show StoryComplete instead of choices when story ends
6. Wire up "Begin conclusion" button

- [ ] **Step 1: Add imports and state variables**

Add to the imports at the top of `StoryWrite.tsx`:

```typescript
import { calculateBeat, type BeatInfo } from "@/lib/story-arc";
import { StoryComplete } from "@/components/story/StoryComplete";
```

Add new state variables alongside existing ones (around line 147):

```typescript
const [targetTurns, setTargetTurns] = useState<number>(35);
const [arcOverride, setArcOverride] = useState<string | null>(null);
const [isStoryComplete, setIsStoryComplete] = useState(false);
```

Note: Do NOT add a separate `activeNodeCount` state — the existing `activeNodes` useMemo (line 608) already tracks active nodes. Use `activeNodes.length` throughout for the beat calculation.
```

- [ ] **Step 2: Load `target_turns` and `arc_override` when story loads**

In the `loadStory` function (around line 181), after `const story = await getStory(storyId!)`, extract the new fields:

```typescript
// After: const story = await getStory(storyId!);
setTargetTurns(story.target_turns ?? 35);
setArcOverride(story.arc_override ?? null);
if (story.status === "completed") {
  setIsStoryComplete(true);
}
```

- [ ] **Step 3: Add a `getCurrentBeat` helper**

Add a helper function inside the component (before `generateOpening`):

```typescript
function getCurrentBeat(nodeCount: number): BeatInfo {
  if (arcOverride === "concluding") {
    // Force into falling/resolution range
    const forcedProgress = Math.max(0.75, nodeCount / targetTurns);
    return calculateBeat(Math.ceil(forcedProgress * targetTurns), targetTurns);
  }
  return calculateBeat(nodeCount, targetTurns);
}
```

- [ ] **Step 4: Pass beat to `generateOpening`**

In `generateOpening` (around line 256), before the `streamSection` call, compute the beat:

```typescript
const beat = getCurrentBeat(0); // Turn 0 for opening
```

Pass it to `streamSection`:

```typescript
streamSection({
  premise: storyMeta.premise,
  genre: storyMeta.genre,
  tone: storyMeta.tone,
  length: sectionLength,
  beat: { phase: beat.phase, progress: beat.progress, isNearEnd: beat.isNearEnd, isFinalSection: false },
  // ... onDelta, onDone, onError
});
```

And pass it to `generateChoices` in the `onDone` callback:

```typescript
generateChoices({
  recentText: fullText.split("\n\n").slice(-3).join("\n\n"),
  tone: storyMeta.tone,
  genre: storyMeta.genre,
  premise: storyMeta.premise,
  beat: { phase: beat.phase, progress: beat.progress },
});
```

- [ ] **Step 5: Pass beat to `handleChoiceSelect`**

In `handleChoiceSelect` (around line 365), compute the beat using current active node count:

```typescript
const currentNodeCount = paragraphs.length; // approximate — each node becomes paragraphs
// Better: count actual active nodes
const beat = getCurrentBeat(/* count of active nodes */);
```

Use the existing `activeNodes` useMemo (line 608) which derives from `allNodes`:

```typescript
const beat = getCurrentBeat(activeNodes.length);
```

Check if the selected choice triggers a final section:

```typescript
const selectedIsConclude = choice.type === "conclude" || choice.type === "epilogue";
const currentIsFinal = isFinalSection || selectedIsConclude;
```

Pass to `streamSection`:

```typescript
beat: {
  phase: beat.phase,
  progress: beat.progress,
  isNearEnd: beat.isNearEnd,
  isFinalSection: currentIsFinal,
},
```

In the `onDone` callback, if it was the final section, mark the story complete:

```typescript
if (currentIsFinal) {
  setIsStoryComplete(true);
  // Update story status in DB
  apiClient.updateStory(storyId, { status: "completed" });
  // Don't generate choices
} else {
  // Generate choices as normal with beat
  generateChoices({
    recentText: ...,
    beat: { phase: beat.phase, progress: beat.progress },
    ...
  });
}
```

- [ ] **Step 6: Implement "Begin conclusion" handler**

Add the handler:

```typescript
async function handleBeginConclusion() {
  setArcOverride("concluding");
  await apiClient.updateStory(storyId, { arc_override: "concluding" });
  // Regenerate choices with the new arc state
  const beat = getCurrentBeat(activeNodes.length);
  setIsLoadingChoices(true);
  try {
    const newChoices = await generateChoices({
      recentText: paragraphs.slice(-3).map(p => p.text).join("\n\n"),
      summary,
      storyState,
      tone: storyMeta.tone,
      genre: storyMeta.genre,
      premise: storyMeta.premise,
      beat: { phase: "falling", progress: beat.progress },
    });
    setChoices(newChoices);
  } finally {
    setIsLoadingChoices(false);
  }
}
```

- [ ] **Step 7: Implement "Continue anyway" handler**

```typescript
function handleContinueAnyway() {
  setIsStoryComplete(false);
  setIsFinalSection(false);
  setArcOverride(null);
  apiClient.updateStory(storyId, { status: "in_progress", arc_override: null });
  // Regenerate choices
  fetchChoices(paragraphs.slice(-3).map(p => p.text).join("\n\n"));
}
```

- [ ] **Step 8: Pass new props to ChoiceCards**

In the JSX where `<ChoiceCards>` is rendered, add the new props:

```tsx
<ChoiceCards
  choices={choices}
  onSelect={handleChoiceSelect}
  onRegenerate={fetchChoices}
  isLoading={isLoadingChoices}
  sectionLength={sectionLength}
  onSectionLengthChange={setSectionLength}
  turnCount={activeNodes.length}
  turnLimit={limits?.turns}
  isNearEnd={getCurrentBeat(activeNodes.length).isNearEnd}
  onBeginConclusion={handleBeginConclusion}
  isStoryComplete={isStoryComplete}
/>
```

If `isStoryComplete`, render `StoryComplete` instead:

```tsx
{isStoryComplete ? (
  <StoryComplete
    onShare={() => { /* existing share logic */ }}
    onExport={() => { /* existing export logic */ }}
    onDashboard={() => navigate("/dashboard")}
    onContinue={handleContinueAnyway}
  />
) : (
  <ChoiceCards ... />
)}
```

- [ ] **Step 9: Test the full flow manually**

1. Create a new story (target_turns defaults to 35)
2. Play through 3-4 turns — verify choices are setup/rising types
3. Advance to ~70% of target — verify "Begin conclusion" button appears
4. Click "Begin conclusion" — verify choices shift to falling/resolution types
5. Select a "conclude" choice — verify final section generates and StoryComplete shows
6. Click "Continue anyway" — verify story resumes

- [ ] **Step 10: Commit**

```bash
git add src/pages/StoryWrite.tsx
git commit -m "$(cat <<'EOF'
feat: integrate narrative arc system into story writing flow

Compute beat from active node count and target turns. Pass phase-aware
beat to section/choice generation. Handle conclude/epilogue choices for
story ending. Add begin-conclusion and continue-anyway flows.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Add custom tone input to `StoryNew.tsx`

**Files:**
- Modify: `src/pages/StoryNew.tsx`

- [ ] **Step 1: Add custom tone state**

Add state variable alongside existing ones (around line 36):

```typescript
const [customTone, setCustomTone] = useState("");
```

- [ ] **Step 2: Add mutual exclusion logic**

When a preset tone is selected, clear custom input:

```typescript
function handleToneSelect(tone: string) {
  setSelectedTone(tone);
  setCustomTone("");
}
```

When custom input changes, deselect preset:

```typescript
function handleCustomToneChange(value: string) {
  setCustomTone(value);
  if (value.length >= 3) {
    setSelectedTone(null);
  }
}
```

- [ ] **Step 3: Compute effective tone**

```typescript
const effectiveTone = customTone.length >= 3 ? customTone : selectedTone;
```

Update the "Begin writing" button enable condition to use `effectiveTone`:

```typescript
disabled={!effectiveTone || creating}
```

And pass `effectiveTone` to `createStory` instead of `selectedTone`.

- [ ] **Step 4: Add the custom tone text input in JSX**

After the preset tone buttons grid, add:

```tsx
<div className="mt-4">
  <p className="text-sm text-muted-foreground mb-2">Or describe your own:</p>
  <input
    type="text"
    value={customTone}
    onChange={(e) => handleCustomToneChange(e.target.value)}
    placeholder="e.g., Noir detective with dry humor"
    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    maxLength={100}
  />
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/StoryNew.tsx
git commit -m "$(cat <<'EOF'
feat: add custom tone text input on story creation page

Users can now type a free-text tone description below the 6 presets.
Selecting a preset clears custom input; typing 3+ chars deselects presets.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Add story length selector to `StoryNew.tsx`

**Files:**
- Modify: `src/pages/StoryNew.tsx`

- [ ] **Step 1: Add target turns state**

```typescript
const [targetTurns, setTargetTurns] = useState<number>(35);
```

- [ ] **Step 2: Define length options**

```typescript
const lengthOptions = [
  { value: 15, label: "Short",  desc: "~15 turns — A tight, focused tale" },
  { value: 35, label: "Medium", desc: "~35 turns — A full narrative arc" },
  { value: 45, label: "Long",   desc: "~45+ turns — An epic journey" },
];
```

- [ ] **Step 3: Add the length selector UI**

Add below the tone section (or as part of the same step):

```tsx
<div className="mt-6">
  <h3 className="text-sm font-medium mb-3">How long should your story be?</h3>
  <div className="grid grid-cols-3 gap-3">
    {lengthOptions.map((opt) => (
      <button
        key={opt.value}
        onClick={() => setTargetTurns(opt.value)}
        className={`px-3 py-3 rounded-lg border text-left transition-colors ${
          targetTurns === opt.value
            ? "border-primary bg-primary/10 text-primary"
            : "border-border hover:border-primary/50"
        }`}
      >
        <div className="font-medium text-sm">{opt.label}</div>
        <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Pass `targetTurns` to `createStory`**

In the `handleStart` function, add `targetTurns` to the create call:

```typescript
const story = await createStory({
  title: premise?.slice(0, 60) || "Untitled Story",
  genre: selectedGenre || undefined,
  tone: effectiveTone || undefined,
  premise: premise || undefined,
  userId: user.id,
  targetTurns,
});
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/StoryNew.tsx
git commit -m "$(cat <<'EOF'
feat: add story length selector (Short/Medium/Long) to creation page

Users choose target story length which feeds into the narrative arc
system. Short=15, Medium=35 (default), Long=45+ turns.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: End-to-end smoke test

**Files:**
- No new files — manual testing

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test story creation with custom tone**

1. Go to `/story/new`
2. Type a custom tone "Film noir with cyberpunk vibes"
3. Verify preset deselects
4. Select "Medium" length
5. Create story — verify it navigates to `/story/:id`

- [ ] **Step 3: Test narrative arc progression**

1. In the story editor, check the network tab for `generate-section` requests
2. Verify `beat` is in the request body with `phase: "setup"` for the opening
3. Advance 3-4 turns — beat should show `rising` phase
4. Verify choice types change (should see `safe`, `risky`, `emotional`, `complicate`)

- [ ] **Step 4: Test conclusion flow**

1. If near end (or use a Short/15-turn story to get there faster), verify "Begin conclusion" button appears
2. Click it — verify choices shift to conclude/resolve types
3. Select a "conclude" choice — verify final section generates
4. Verify "Story Complete" card appears with Share/Export/Dashboard/Continue options
5. Click "Continue anyway" — verify story resumes with new choices

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npm run test`
Expected: All existing tests pass. The new `story-arc.test.ts` tests also pass.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: address issues found during end-to-end testing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

| Task | Description | Files | Est. |
|------|-------------|-------|------|
| 1 | Database migration + stories API | `api/db/stories.ts` | 3 min |
| 2 | Beat calculator (`calculateBeat`) | `src/lib/story-arc.ts`, test | 5 min |
| 3 | Pacing instructions + choice type maps | `src/lib/story-arc.ts`, test | 5 min |
| 4 | Update `generate-section` API | `api/generate-section.ts` | 5 min |
| 5 | Update `generate-choices` API | `api/generate-choices.ts` | 5 min |
| 6 | Update `story-api.ts` client | `src/lib/story-api.ts` | 3 min |
| 7 | Update ChoiceCards types + UI | `ChoiceCards.tsx` | 5 min |
| 8 | Create StoryComplete component | `StoryComplete.tsx` | 3 min |
| 9 | Wire beat system into StoryWrite | `StoryWrite.tsx` | 10 min |
| 10 | Custom tone input | `StoryNew.tsx` | 3 min |
| 11 | Story length selector | `StoryNew.tsx` | 3 min |
| 12 | End-to-end smoke test | — | 5 min |

# Tone Fidelity, Naming Variety, and Opening Regeneration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tone presets produce meaningfully different prose, improve name diversity across genres, and give users a clean way to redo their opening before committing to the story.

**Architecture:** A new shared module (`src/lib/tone-profiles.ts`) holds tone profiles and naming guidance. API routes consume these at prompt-construction time. The regenerate-opening action reuses the existing `generateOpening` flow in `StoryWrite.tsx`, updating the root node in place. No new API routes, no new persistence.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Vitest, Testing Library, Vercel API routes (Edge runtime for AI, Node.js for DB)

**Spec:** `docs/superpowers/specs/2026-03-29-tone-naming-opening-regen-design.md`

---

## File Structure

### New files

| File | Responsibility |
| --- | --- |
| `src/lib/tone-profiles.ts` | Tone profile definitions (label, helper, systemDirective) for each preset. Genre-aware naming guidance builder. Lookup helpers for both API routes and UI components. |
| `src/test/tone-profiles.test.ts` | Unit tests for profile lookup, custom tone fallback, and naming guidance builder |

### Modified files

| File | Responsibility |
| --- | --- |
| `api/generate-section.ts` | Replace thin tone one-liner with full profile directive. Add naming guidance block after genre. |
| `api/generate-choices.ts` | Replace thin tone one-liner with full profile directive. |
| `src/pages/StoryNew.tsx` | Import profiles, render helper lines below preset tone labels. Remove duplicated preset array. |
| `src/components/story/TonePanel.tsx` | Import profiles, render helper lines below preset tone labels. Remove duplicated preset array. |
| `src/pages/StoryWrite.tsx` | Add `isAtOpening` derived state. Add `handleRegenerateOpening` handler. Render "Try a different opening" pill between StoryCanvas and ChoiceCards. |
| `src/test/story-write-arc.test.tsx` | Integration tests for regenerate-opening visibility and disappearance |

---

## Task 1: Create the shared tone profiles module

**Files:**
- Create: `src/lib/tone-profiles.ts`
- Create: `src/test/tone-profiles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/test/tone-profiles.test.ts`:

```tsx
import { describe, expect, it } from "vitest";
import {
  getToneProfile,
  getToneDirective,
  getNamingGuidance,
  TONE_PROFILES,
} from "@/lib/tone-profiles";

describe("tone profiles", () => {
  it("returns a full profile for each preset tone", () => {
    const profile = getToneProfile("Dark & gritty");
    expect(profile).toBeDefined();
    expect(profile!.label).toBe("Dark & gritty");
    expect(profile!.helper).toBeTruthy();
    expect(profile!.systemDirective).toBeTruthy();
    expect(profile!.systemDirective.length).toBeGreaterThan(100);
  });

  it("returns undefined for a custom tone", () => {
    expect(getToneProfile("My weird custom tone")).toBeUndefined();
  });

  it("returns the full directive for a preset tone", () => {
    const directive = getToneDirective("Poetic & dreamlike");
    expect(directive).toContain("Lush imagery");
    expect(directive).toContain("TONE:");
  });

  it("returns a thin one-liner for a custom tone", () => {
    const directive = getToneDirective("Sardonic and cold");
    expect(directive).toBe("TONE: Write in a Sardonic and cold style. Maintain this tone consistently.");
  });

  it("returns undefined directive when no tone is provided", () => {
    expect(getToneDirective(undefined)).toBeUndefined();
  });

  it("exports all six preset profiles", () => {
    expect(TONE_PROFILES).toHaveLength(6);
    const labels = TONE_PROFILES.map((p) => p.label);
    expect(labels).toContain("Dark & gritty");
    expect(labels).toContain("Whimsical & light");
    expect(labels).toContain("Literary & introspective");
    expect(labels).toContain("Fast-paced & cinematic");
    expect(labels).toContain("Poetic & dreamlike");
    expect(labels).toContain("Humorous & witty");
  });
});

describe("naming guidance", () => {
  it("returns fantasy-specific guidance for fantasy genre", () => {
    const guidance = getNamingGuidance("Fantasy");
    expect(guidance).toContain("NAMING");
    expect(guidance).toContain("pseudo-elvish");
  });

  it("returns sci-fi-specific guidance", () => {
    const guidance = getNamingGuidance("Sci-Fi");
    expect(guidance).toContain("institutional");
  });

  it("returns contemporary guidance for mystery", () => {
    const guidance = getNamingGuidance("Mystery");
    expect(guidance).toContain("contemporary");
  });

  it("returns horror-specific guidance", () => {
    const guidance = getNamingGuidance("Horror");
    expect(guidance).toContain("whimsical");
  });

  it("returns general guidance for an unknown genre", () => {
    const guidance = getNamingGuidance("Underwater Basket Weaving");
    expect(guidance).toContain("NAMING");
    expect(guidance).toContain("Elara");
  });

  it("returns general guidance when no genre is provided", () => {
    const guidance = getNamingGuidance(undefined);
    expect(guidance).toContain("NAMING");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run test -- src/test/tone-profiles.test.ts
```

Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Implement the tone profiles module**

Create `src/lib/tone-profiles.ts`:

```ts
export interface ToneProfile {
  label: string;
  helper: string;
  systemDirective: string;
}

export const TONE_PROFILES: ToneProfile[] = [
  {
    label: "Dark & gritty",
    helper: "Harsh detail, grounded tension, rough realism",
    systemDirective:
      "Harsh detail, grounded tension, rough realism. Short declarative sentences dominate. Imagery is functional and unsparing — grime, weight, damage. Emotional distance is close but unsentimental. Introspection is minimal; characters act and react rather than reflect. Narration is blunt and direct.",
  },
  {
    label: "Whimsical & light",
    helper: "Playful voice, bright turns, airy charm",
    systemDirective:
      "Playful voice, bright turns, airy charm. Sentence rhythm bounces — short quips alternate with breezy longer lines. Imagery skews bright, odd, slightly exaggerated. Emotional distance is warm but never heavy. Introspection is light and often humorous. Narration has a wry, affectionate quality.",
  },
  {
    label: "Literary & introspective",
    helper: "Layered prose, careful interiority, symbolic detail",
    systemDirective:
      "Layered prose with careful attention to interiority. Sentences vary in length with deliberate rhythm. Imagery is selective and resonant — details carry symbolic weight. Emotional distance is close, with the narrative voice tracking the protagonist's inner experience. Introspection runs deep. Narration is measured and precise.",
  },
  {
    label: "Fast-paced & cinematic",
    helper: "Clear action lines, brisk momentum, visual immediacy",
    systemDirective:
      "Clear action lines, brisk momentum, visual immediacy. Sentences run short to medium with minimal subordinate clauses. Imagery is selective but vivid — camera-like, focused on motion and sensory impact. Emotional distance is moderate — enough to feel stakes, not enough to slow the pace. Introspection is minimal; when it appears it is brief and pressured. Narration is direct and propulsive.",
  },
  {
    label: "Poetic & dreamlike",
    helper: "Lush imagery, soft rhythm, surreal edges",
    systemDirective:
      "Lush imagery, soft rhythm, surreal edges. Sentences flow long with internal cadence and occasional fragmentation. Imagery is dense and often synesthetic or metaphorical. Emotional distance is immersive — the reader is inside the sensation. Introspection is deep but non-analytical, more felt than reasoned. Narration is allusive and layered.",
  },
  {
    label: "Humorous & witty",
    helper: "Sharp observations, comedic timing, irreverent edges",
    systemDirective:
      "Sharp observational voice, comedic timing, irreverent edges. Sentences vary — setups run longer, punchlines land short. Imagery is selective and often absurd or exaggerated for effect. Emotional distance is warm but deflective — sincerity hides behind humor. Introspection is intermittent and self-aware. Narration has a distinct personality and breaks the fourth wall lightly when appropriate.",
  },
];

const profileMap = new Map(TONE_PROFILES.map((p) => [p.label.toLowerCase(), p]));

/** Return the full profile for a preset tone, or undefined for custom tones. */
export function getToneProfile(tone: string): ToneProfile | undefined {
  return profileMap.get(tone.toLowerCase());
}

/**
 * Return the TONE system-prompt block for a given tone string.
 * Preset tones get the rich multi-sentence directive.
 * Custom tones get the existing thin one-liner.
 */
export function getToneDirective(tone: string | undefined): string | undefined {
  if (!tone) return undefined;
  const profile = getToneProfile(tone);
  if (profile) {
    return `TONE: ${profile.systemDirective}`;
  }
  return `TONE: Write in a ${tone} style. Maintain this tone consistently.`;
}

const GENERAL_NAMING = `NAMING:
- Avoid common AI-default fantasy names (Elara, Kael, Lyra, Zephyr, Rowan, Aria, Thorne) and close phonetic cousins.
- Vary phonetic shape across characters introduced in the same section.
- Preserve premise-given names exactly when they exist.
- Fit names to the implied setting and time period.`;

const GENRE_NAMING: Record<string, string> = {
  fantasy: `${GENERAL_NAMING}
- Vary cultural feel broadly. Avoid clustering around soft lyrical pseudo-elvish patterns.
- Mix guttural, clipped, polysyllabic, and compound names. Draw from wider cultural and linguistic inspirations.`,

  "sci-fi": `${GENERAL_NAMING}
- Allow technical, institutional, multilingual, industrial, or class-coded naming.
- Names can reflect social structures, corporate culture, or linguistic drift.`,

  "science fiction": `${GENERAL_NAMING}
- Allow technical, institutional, multilingual, industrial, or class-coded naming.
- Names can reflect social structures, corporate culture, or linguistic drift.`,

  mystery: `${GENERAL_NAMING}
- Default toward believable contemporary names that fit the implied setting and demographics.
- Avoid fantasy-inflected naming unless the premise pushes otherwise.`,

  thriller: `${GENERAL_NAMING}
- Default toward believable contemporary names that fit the implied setting and demographics.
- Avoid fantasy-inflected naming unless the premise pushes otherwise.`,

  romance: `${GENERAL_NAMING}
- Default toward believable contemporary names that fit the implied setting and demographics.
- Avoid fantasy-inflected naming unless the premise pushes otherwise.`,

  horror: `${GENERAL_NAMING}
- Avoid accidentally whimsical or soft names unless that contrast is intentional to the story's setup.
- Ground names in the setting's reality — mundane names can be more unsettling than exotic ones.`,
};

/** Return genre-appropriate naming guidance for the system prompt. */
export function getNamingGuidance(genre: string | undefined): string {
  if (!genre) return GENERAL_NAMING;
  return GENRE_NAMING[genre.toLowerCase()] ?? GENERAL_NAMING;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm run test -- src/test/tone-profiles.test.ts
```

Expected: PASS — all profile lookup and naming guidance tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tone-profiles.ts src/test/tone-profiles.test.ts
git commit -m "feat: add shared tone profiles and naming guidance module"
```

---

## Task 2: Wire tone profiles into API prompt construction

**Files:**
- Modify: `api/generate-section.ts`
- Modify: `api/generate-choices.ts`

- [ ] **Step 1: Write the failing tests for prompt construction**

Add to `src/test/tone-profiles.test.ts`:

```tsx
describe("prompt integration contracts", () => {
  it("getToneDirective returns TONE: prefix for presets", () => {
    const directive = getToneDirective("Dark & gritty");
    expect(directive).toMatch(/^TONE:/);
    expect(directive).toContain("Short declarative sentences");
  });

  it("getToneDirective returns TONE: prefix for custom tones", () => {
    const directive = getToneDirective("Brooding noir");
    expect(directive).toBe("TONE: Write in a Brooding noir style. Maintain this tone consistently.");
  });

  it("getNamingGuidance returns NAMING: prefix", () => {
    const guidance = getNamingGuidance("Fantasy");
    expect(guidance).toMatch(/^NAMING:/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they pass**

These should already pass with the Task 1 implementation, confirming the contract the API routes will rely on.

Run:

```bash
npm run test -- src/test/tone-profiles.test.ts
```

Expected: PASS.

- [ ] **Step 3: Update `api/generate-section.ts` to use rich tone directives and naming guidance**

In `api/generate-section.ts`, add the import at the top:

```ts
import { getToneDirective, getNamingGuidance } from "../src/lib/tone-profiles.js";
```

In the `buildSystemPrompt` function, replace line 172:

```ts
if (tone) prompt += `\n\nTONE: Write in a ${tone} style. Maintain this tone consistently.`;
```

With:

```ts
const toneBlock = getToneDirective(tone);
if (toneBlock) prompt += `\n\n${toneBlock}`;
```

After line 173 (the genre line `if (genre) prompt += ...`), add:

```ts
if (genre) prompt += `\n\n${getNamingGuidance(genre)}`;
```

Note: The existing `if (genre) prompt += \`\n\nGENRE: ${genre}\`;` stays as-is. The naming guidance is appended separately after it.

- [ ] **Step 4: Update `api/generate-choices.ts` to use rich tone directives**

In `api/generate-choices.ts`, add the import at the top:

```ts
import { getToneDirective } from "../src/lib/tone-profiles.js";
```

Replace the tone line in the system prompt template (around line 157):

```ts
${tone ? `TONE: ${tone}` : ""}
```

With:

```ts
${getToneDirective(tone) ?? ""}
```

- [ ] **Step 5: Run the full test suite**

Run:

```bash
npm run test
```

Expected: PASS — all existing tests still green, no behavioral changes visible to tests (prompt internals changed but mocked in integration tests).

- [ ] **Step 6: Run the build**

Run:

```bash
npm run build
```

Expected: PASS — API route imports resolve correctly.

- [ ] **Step 7: Commit**

```bash
git add api/generate-section.ts api/generate-choices.ts src/test/tone-profiles.test.ts
git commit -m "feat: wire rich tone profiles and naming guidance into AI prompts"
```

---

## Task 3: Add helper lines to tone selection UI

**Files:**
- Modify: `src/pages/StoryNew.tsx`
- Modify: `src/components/story/TonePanel.tsx`
- Modify: `src/test/story-structure-sheet.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add a new test file `src/test/tone-helper-lines.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TonePanelContent } from "@/components/story/TonePanel";
import { TONE_PROFILES } from "@/lib/tone-profiles";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("tone helper lines", () => {
  it("renders a helper line for each preset tone in TonePanel", () => {
    render(
      <TonePanelContent
        currentTone="Dark & gritty"
        onToneChange={vi.fn()}
      />,
    );

    for (const profile of TONE_PROFILES) {
      expect(screen.getByText(profile.helper)).toBeInTheDocument();
    }
  });

  it("helper lines are visible alongside their preset labels", () => {
    render(
      <TonePanelContent
        currentTone=""
        onToneChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Dark & gritty")).toBeInTheDocument();
    expect(screen.getByText("Harsh detail, grounded tension, rough realism")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run test -- src/test/tone-helper-lines.test.tsx
```

Expected: FAIL — helper lines are not rendered yet.

- [ ] **Step 3: Update `TonePanel.tsx` to show helper lines**

In `src/components/story/TonePanel.tsx`, replace the local `presetTones` array import with the profiles:

```ts
import { TONE_PROFILES } from "@/lib/tone-profiles";
```

Remove the local `presetTones` array (lines 4-11).

Update the preset buttons grid to use `TONE_PROFILES` instead of `presetTones`. Change the mapping from:

```tsx
{presetTones.map((tone) => (
  <button
    key={tone}
    onClick={() => { onToneChange(tone); }}
    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
      currentTone === tone
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
    }`}
  >
    {tone}
  </button>
))}
```

To:

```tsx
{TONE_PROFILES.map((profile) => (
  <button
    key={profile.label}
    onClick={() => { onToneChange(profile.label); }}
    className={`px-3 py-2 text-left text-sm rounded-lg border transition-colors ${
      currentTone === profile.label
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
    }`}
  >
    <span className="font-medium">{profile.label}</span>
    <span className="block text-xs text-muted-foreground mt-0.5">{profile.helper}</span>
  </button>
))}
```

- [ ] **Step 4: Update `StoryNew.tsx` to show helper lines**

In `src/pages/StoryNew.tsx`, replace the local `tones` array with the import:

```ts
import { TONE_PROFILES } from "@/lib/tone-profiles";
```

Remove the local `tones` array (lines 25-32).

Update the tone grid (around lines 265-280) from:

```tsx
{tones.map((t) => (
  <button
    key={t}
    onClick={() => { setSelectedTone(t); setCustomTone(""); }}
    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
      selectedTone === t
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
    }`}
  >
    {t}
  </button>
))}
```

To:

```tsx
{TONE_PROFILES.map((profile) => (
  <button
    key={profile.label}
    onClick={() => { setSelectedTone(profile.label); setCustomTone(""); }}
    className={`px-3 py-2 text-left text-sm rounded-lg border transition-colors ${
      selectedTone === profile.label
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
    }`}
  >
    <span className="font-medium">{profile.label}</span>
    <span className="block text-xs text-muted-foreground mt-0.5">{profile.helper}</span>
  </button>
))}
```

- [ ] **Step 5: Run the tests**

Run:

```bash
npm run test -- src/test/tone-helper-lines.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the full test suite**

Run:

```bash
npm run test
```

Expected: PASS — existing TonePanel and StoryNew tests still green. The `StoryToolsSheet` test in `story-structure-sheet.test.tsx` clicks a tone button by name (`/dark & gritty/i`) which still matches the label text inside the new markup.

- [ ] **Step 7: Commit**

```bash
git add src/components/story/TonePanel.tsx src/pages/StoryNew.tsx src/test/tone-helper-lines.test.tsx
git commit -m "feat: add helper lines to tone preset selection"
```

---

## Task 4: Add regenerate-opening action

**Files:**
- Modify: `src/pages/StoryWrite.tsx`
- Modify: `src/test/story-write-arc.test.tsx`

- [ ] **Step 1: Write the failing integration tests**

Add these tests to `src/test/story-write-arc.test.tsx`, inside the main describe block:

```tsx
  it("shows a regenerate-opening action when the story has only the root node", async () => {
    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("choice-cards")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /try a different opening/i })).toBeInTheDocument();
  });

  it("hides the regenerate-opening action after the story progresses beyond the opening", async () => {
    // Default mock has 2 nodes — opening + continuation
    getStoryNodesMock.mockResolvedValueOnce([
      {
        id: "node-1",
        text: "Opening paragraph.",
        summary: "Opening",
        story_state: { stage: "setup" },
        choices: [
          { type: "safe", label: "Continue", preview: "Go on." },
        ],
        is_active: true,
        chosen_option: { type: "safe", label: "Continue", preview: "Go on." },
      },
      {
        id: "node-2",
        text: "Second section.",
        summary: "Second",
        story_state: { stage: "setup" },
        choices: [],
        is_active: true,
      },
    ]);

    renderStoryWrite();

    await waitFor(() => expect(screen.getByTestId("choice-cards")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /try a different opening/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npm run test -- src/test/story-write-arc.test.tsx
```

Expected: FAIL — no "Try a different opening" button exists yet.

- [ ] **Step 3: Check how many nodes the default test mock provides**

The default `getStoryNodesMock` in the test file returns 1 node (the root). Verify this by checking the test setup. If it returns more than 1, the first test will need its own mock override to set up a single-node story.

- [ ] **Step 4: Implement the regenerate-opening action in `StoryWrite.tsx`**

Add the `RefreshCw` import at the top of `StoryWrite.tsx` (if not already imported):

```ts
import { RefreshCw } from "lucide-react";
```

Ensure `apiClient` is imported from `@/lib/api-client` (check if it's already imported — `StoryWrite.tsx` may import helpers from `@/lib/story-api` instead). If not imported, add:

```ts
import { apiClient } from "@/lib/api-client";
```

After the `activeNodes` memo (around line 975), add:

```ts
const isAtOpening = activeNodes.length === 1 && !activeNodes[0]?.chosen_option;
```

Add the regenerate handler near the other handlers (after `generateOpening`).

This cannot simply call `generateOpening()` because that function calls `createStoryNode` on completion, which would create a duplicate root. Instead, we stream new text with `streamSection`, then update the existing root node via `apiClient.updateNode`:

```ts
const handleRegenerateOpening = async () => {
  if (!isAtOpening || isGenerating) return;
  const rootNode = activeNodes[0];
  if (!rootNode) return;

  setChoices([]);
  setIsGenerating(true);
  let fullText = "";

  setParagraphs([{ id: `streaming-${Date.now()}`, text: "", isStreaming: true }]);

  const beat = getCurrentBeat(0);
  await streamSection({
    premise: storyMeta.premise,
    genre: storyMeta.genre,
    tone: storyMeta.tone,
    length: sectionLength,
    arcMode: arcOverride ?? undefined,
    beat: buildBeatPayload(beat, false),
    onDelta: (delta) => {
      fullText += delta;
      const paras = fullText.split("\n\n").filter(Boolean);
      setParagraphs(paras.map((t, i) => ({
        id: `gen-${i}`,
        text: t,
        isStreaming: i === paras.length - 1,
      })));
    },
    onDone: async (text) => {
      setIsGenerating(false);
      setIsProcessing(true);
      const paras = text.split("\n\n").filter(Boolean);
      setParagraphs(paras.map((t, i) => ({ id: `gen-${i}`, text: t })));

      const summarizePromise = summarizeStory({ fullText: text, storyState: {} });
      const initialMoveFamilies = selectMoveFamilies({
        phase: beat.phase,
        arcMode: arcOverride ?? "normal",
        previousEnding: arcState?.endedWith ?? null,
        recentFamilies: [],
        variantOffset: choiceVariantOffset,
      });
      const choicesPromise = generateChoices({
        recentText: text.split("\n\n").slice(-3).join("\n\n"),
        summary: "",
        storyState: {},
        tone: storyMeta.tone,
        genre: storyMeta.genre,
        premise: storyMeta.premise,
        beat: buildBeatPayload(beat, false),
        arcMode: arcOverride ?? "normal",
        moveFamilies: initialMoveFamilies,
        previousEnding: arcState?.endedWith ?? null,
      });

      try {
        const results = await Promise.allSettled([summarizePromise, choicesPromise]);
        const summaryResult = results[0].status === "fulfilled" ? results[0].value : null;
        const choicesResult = results[1].status === "fulfilled" ? results[1].value : null;

        if (summaryResult) {
          setSummary(summaryResult.summary);
          setStoryState(summaryResult.story_state);
        }
        if (choicesResult) {
          setChoices(choicesResult);
        } else {
          toast.error("Failed to generate choices — you can regenerate them manually");
        }

        // Update the existing root node in place — do NOT create a new one
        await retry(() => apiClient.updateNode(rootNode.id, {
          text,
          summary: summaryResult?.summary || "",
          story_state: summaryResult?.story_state || storyState,
          choices: choicesResult || [],
        }));
        await reloadActiveState();

        // Update title if still auto-derived
        const firstLine = text.split(".")[0]?.trim();
        if (firstLine && storyTitle === "Untitled Story") {
          const title = firstLine.length > 50 ? firstLine.slice(0, 50) + "…" : firstLine;
          setStoryTitle(title);
          await updateStoryTitle(storyId!, title);
        }
      } catch (e) {
        console.error("Failed to save regenerated opening:", e);
        toast.error("Failed to save — please try again");
      }
      setIsProcessing(false);
      setIsLoadingChoices(false);
    },
    onError: (err) => {
      setIsGenerating(false);
      setIsProcessing(false);
      toast.error(err);
    },
  } as any);
};
```

In the JSX, between the `StoryCanvas` component and the processing indicator (between lines ~1599 and ~1603), add:

```tsx
{isAtOpening && !isGenerating && !isProcessing ? (
  <div className="mt-4 animate-fade-in">
    <button
      type="button"
      onClick={handleRegenerateOpening}
      className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors flex items-center gap-1.5"
    >
      <RefreshCw className="w-3 h-3" />
      Try a different opening
    </button>
  </div>
) : null}
```

- [ ] **Step 5: Run the tests**

Run:

```bash
npm run test -- src/test/story-write-arc.test.tsx
```

Expected: PASS — both new tests green, all existing tests still pass.

- [ ] **Step 6: Run the full test suite and build**

Run:

```bash
npm run test && npm run build
```

Expected: PASS on both.

- [ ] **Step 7: Commit**

```bash
git add src/pages/StoryWrite.tsx src/test/story-write-arc.test.tsx
git commit -m "feat: add regenerate-opening action for single-node stories"
```

---

## Final Verification

- [ ] Run the full test suite:

```bash
npm run test
```

- [ ] Run the production build:

```bash
npm run build
```

- [ ] Manual sanity check:
  - Story creation: each tone preset shows a brief helper line
  - Mid-story tone panel: each preset shows the same helper lines
  - New story opening: prose quality differs noticeably between "Dark & gritty" and "Poetic & dreamlike"
  - Opening screen: "Try a different opening" pill is visible below the text
  - After selecting a choice: the pill disappears
  - Character names: vary by genre and avoid the Elara/Kael/Lyra defaults

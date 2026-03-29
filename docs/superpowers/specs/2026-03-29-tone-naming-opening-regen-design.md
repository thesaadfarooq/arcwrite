# Tone Fidelity, Naming Variety, and Opening Regeneration

**Goal:** Make tone presets produce meaningfully different prose, improve name diversity across genres, and give users a clean way to redo their opening before committing to the story.

**Architecture:** All AI-quality improvements live in prompt construction — no new persistence, no new API routes. The regenerate-opening action reuses the existing section and choice generation flows. A shared tone-profile module provides the hidden profiles and visible helper lines so they stay in sync.

**Tech stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Vitest, Testing Library, Vercel API routes (Edge runtime for AI, Node.js for DB).

---

## Section 1: Tone Presets Map to Hidden Style Profiles

### Current state

Tone is passed as a bare string and injected into the system prompt as:

```
TONE: Write in a Dark & gritty style. Maintain this tone consistently.
```

This is too thin for the model to produce meaningfully different prose across presets.

### Design

Each preset maps to a hidden profile that describes concrete prose behavior across five axes:

| Axis | What it controls |
|------|-----------------|
| Sentence rhythm | Short/punchy vs. flowing/layered vs. clipped/urgent |
| Imagery density | Spare/functional vs. lush/ornamental vs. selective/cinematic |
| Emotional distance | Close/raw vs. observational/dry vs. immersed/dreamlike |
| Introspection level | Minimal vs. moderate vs. deep |
| Narration sharpness | Blunt/direct vs. soft/allusive vs. playful/wry |

Profiles for the six presets:

**Dark & gritty**
Harsh detail, grounded tension, rough realism. Short declarative sentences dominate. Imagery is functional and unsparing — grime, weight, damage. Emotional distance is close but unsentimental. Introspection is minimal; characters act and react rather than reflect. Narration is blunt and direct.

**Whimsical & light**
Playful voice, bright turns, airy charm. Sentence rhythm bounces — short quips alternate with breezy longer lines. Imagery skews bright, odd, slightly exaggerated. Emotional distance is warm but never heavy. Introspection is light and often humorous. Narration has a wry, affectionate quality.

**Literary & introspective**
Layered prose with careful attention to interiority. Sentences vary in length with deliberate rhythm. Imagery is selective and resonant — details carry symbolic weight. Emotional distance is close, with the narrative voice tracking the protagonist's inner experience. Introspection runs deep. Narration is measured and precise.

**Fast-paced & cinematic**
Clear action lines, brisk momentum, visual immediacy. Sentences run short to medium with minimal subordinate clauses. Imagery is selective but vivid — camera-like, focused on motion and sensory impact. Emotional distance is moderate — enough to feel stakes, not enough to slow the pace. Introspection is minimal; when it appears it is brief and pressured. Narration is direct and propulsive.

**Poetic & dreamlike**
Lush imagery, soft rhythm, surreal edges. Sentences flow long with internal cadence and occasional fragmentation. Imagery is dense and often synesthetic or metaphorical. Emotional distance is immersive — the reader is inside the sensation. Introspection is deep but non-analytical, more felt than reasoned. Narration is allusive and layered.

**Humorous & witty**
Sharp observational voice, comedic timing, irreverent edges. Sentences vary — setups run longer, punchlines land short. Imagery is selective and often absurd or exaggerated for effect. Emotional distance is warm but deflective — sincerity hides behind humor. Introspection is intermittent and self-aware. Narration has a distinct personality and breaks the fourth wall lightly when appropriate.

### How profiles reach the model

A new shared module (`src/lib/tone-profiles.ts`) exports:

```ts
interface ToneProfile {
  label: string;          // "Dark & gritty"
  helper: string;         // "Harsh detail, grounded tension, rough realism"
  systemDirective: string; // Full hidden multi-sentence profile
}
```

The `buildSystemPrompt` function in `api/generate-section.ts` replaces the thin one-liner with the full `systemDirective` when the tone matches a preset. Custom tones still use the existing one-liner format.

The `api/generate-choices.ts` system prompt also uses the profile's `systemDirective` so choice text aligns with the prose tone.

---

## Section 2: Tone Selection Gets One Short Helper Line

### Current state

`StoryNew.tsx` and `TonePanel.tsx` render tone presets as bare labels with no explanation.

### Design

Each preset shows a brief muted helper line below its label. These come from the same `ToneProfile` objects that drive the hidden profiles, so visible explanation and model guidance cannot drift apart.

Visual treatment:
- Preset label in normal weight
- Helper line in `text-xs text-muted-foreground`, one line, below the label
- No expanding previews, no separate panel, no prose samples

Examples as rendered:

> **Dark & gritty**
> Harsh detail, grounded tension, rough realism

> **Poetic & dreamlike**
> Lush imagery, soft rhythm, surreal edges

This applies to both places tone presets appear: `StoryNew.tsx` (story creation) and `TonePanel.tsx` (mid-story tone change).

---

## Section 3: Naming Variety Through Hidden Genre-Aware Guidance

### Current state

Name generation relies on the model's defaults, which trend toward a narrow band of soft lyrical fantasy names regardless of genre.

### Design

Naming guidance is injected into the system prompt for opening generation and section generation. No persistence, no user-facing controls, no name tracking.

The guidance varies by genre:

**Fantasy:** Vary phonetic shape and cultural feel broadly. Avoid clustering around soft lyrical pseudo-elvish patterns. Mix guttural, clipped, polysyllabic, and compound names. Draw from wider cultural and linguistic inspirations.

**Sci-fi:** Allow technical, institutional, multilingual, industrial, or class-coded naming. Names can reflect social structures, corporate culture, or linguistic drift.

**Mystery / Thriller / Romance:** Default toward believable contemporary names that fit the implied setting and demographics. Avoid fantasy-inflected naming unless the premise pushes otherwise.

**Horror:** Avoid accidentally whimsical or soft names unless that contrast is intentional to the story's setup.

**General rules (all genres):**
- Avoid common AI-default fantasy names (Elara, Kael, Lyra, Zephyr, etc.) and close phonetic cousins
- Vary phonetic shape across characters introduced in the same section
- Preserve premise-given names exactly when they exist
- Fit names to the implied setting and time period

This guidance is appended to the system prompt in `api/generate-section.ts` as a `NAMING` block, keyed off the genre. A `getNamingGuidance(genre: string)` function in `src/lib/tone-profiles.ts` builds the genre-appropriate block. Keeping it in the same module as tone profiles avoids a separate file for what is ultimately another prompt-construction helper.

---

## Section 4: Regenerate Opening Action

### Current state

Once the opening generates, the user's only option is to pick a choice and continue. There is no way to get a different opening from the same premise.

### Design

A "Try a different opening" action appears below the opening text, above the choice cards. It is only visible when:

1. The story has exactly one node (the root)
2. That node has no children (the user has not advanced)

**Behavior:**
- Clicking it sets a loading state and calls the existing `generateOpening` flow in `StoryWrite.tsx`
- The existing root node is updated in place via the existing `updateStoryNode` API (same node ID, new text) — no node is created or deleted
- Summarization and choice generation re-run automatically as part of the `generateOpening` flow, since they chain off the streamed text
- If the story title was auto-derived from the opening, it updates from the replacement
- After the user takes their first continuation action (selecting a choice or submitting custom direction), the button disappears permanently for that story

**Visual treatment:**
- Subtle pill button matching the secondary actions style: `rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground`
- Icon: `RefreshCw` (already imported in ChoiceCards)
- Loading state: icon spins, text changes to "Generating new opening..."
- Positioned between the story text and the choice cards, left-aligned

**Not in scope:** This is not branching. It does not store alternatives. It is a clean redo that replaces the opening in place.

---

## Section 5: Implementation Boundaries

### In scope
- Hidden tone profiles driving opening and section generation
- Tone profile alignment in choice generation
- Visible helper lines on tone presets in StoryNew and TonePanel
- Genre-aware naming guidance in section generation prompts
- Regenerate-opening action with clear visibility rules
- Test coverage for all of the above

### Out of scope
- Changing preset tone names
- Multi-opening alternatives or branching
- Persistent name tracking or account-wide name memory
- Turning opening regeneration into a compare/pick flow
- Broader story-flow redesign
- Custom tone profiles (custom tones keep the existing one-liner behavior)

### Code areas

| File | Changes |
|------|---------|
| `src/lib/tone-profiles.ts` | **New.** Shared tone profile definitions (label, helper, systemDirective). Genre naming guidance builder. |
| `api/generate-section.ts` | Replace thin tone one-liner with full profile directive. Add naming guidance block. |
| `api/generate-choices.ts` | Use tone profile directive for choice text alignment. |
| `src/pages/StoryNew.tsx` | Import profiles, render helper lines below preset labels. |
| `src/components/story/TonePanel.tsx` | Import profiles, render helper lines below preset labels. |
| `src/pages/StoryWrite.tsx` | Add regenerate-opening state, handler, and visibility check (single root node, no children). Render the "Try a different opening" pill between StoryCanvas and ChoiceCards. |

### Testing

| Area | Coverage |
|------|----------|
| Tone profiles | Profile lookup returns full directive for each preset; custom tones fall back to one-liner |
| Naming guidance | Genre-keyed guidance builder returns appropriate blocks; unknown genres get general rules |
| Helper lines | StoryNew and TonePanel render helper text for each preset |
| Regenerate opening | Action visible on single-node stories; hidden after first continuation; replaces node text and refreshes choices |
| Prompt construction | generate-section includes tone directive and naming block; generate-choices includes tone directive |

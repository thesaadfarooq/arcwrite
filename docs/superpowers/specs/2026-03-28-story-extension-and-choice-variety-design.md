# Story Extension, Choice Variety, and Chapter Title Assist Design

## Context

The current story-arc system improved pacing and endings, but three product gaps remain:

1. Extending a completed story feels awkward. `Continue anyway` clears completion state and immediately drops the user back into late-arc pacing, so `Conclusion` and `Epilogue` can reappear too quickly.
2. Choice variety is still too rigid. Each phase currently maps to exactly 4 fixed move types, which limits regeneration quality and makes the system feel predictable.
3. Chapter title help is too passive. AI chapter naming exists only indirectly through chapter review suggestions and cannot be explicitly requested during rename.

## Goals

- Keep the current 4-card choice UI.
- Preserve broad cross-genre support.
- Make story extension feel intentional and coherent without building a full second arc engine.
- Increase move variety internally while keeping visible labels simple.
- Add user-invoked chapter title generation in a controlled V1 surface.

## Non-Goals

- No full sequel-mode or second complete arc engine.
- No genre-specific UI variants.
- No passive chapter-title prompts.
- No V1 rollout of AI title generation beyond the chapter list.

## Chosen Direction

Ship an incremental narrative move system:

- keep the phase-based arc model
- expand each phase from 4 fixed types to a larger move pool
- select 4 distinct move families per turn before prompting the model
- add a temporary post-ending buffer after `Continue anyway`
- add chapter-list `Generate title` and `Reroll`

Deferred alternatives are tracked separately:

- Issue `#1`: explicit extension-intent chooser
- Issue `#2`: chapter title generation on additional rename surfaces
- Issue `#3`: alternative narrative choice systems beyond the incremental move model

## Post-Ending Buffer

When a user clicks `Continue anyway`, the story enters a temporary post-ending buffer instead of returning directly to normal late-arc pacing.

### User experience

- When the user continues, set story `status` back to `in_progress`.
- Set a subtle state indicator such as `After the ending`.
- The story continues generating real text during this mode. This is not a menu-only state.
- The writing prompt must explicitly treat the previous ending as canon and bridge naturally from it.
- `Epilogue` can still appear when it fits, but it is optional and never guaranteed.
- If the story already ended on `epilogue`, suppress `Epilogue` during the next post-ending buffer.

### Buffer move pool

The post-ending pool is separate from the ordinary arc pools:

- `aftermath`
- `reflect`
- `loose_thread`
- `new_problem`
- `time_skip`
- `epilogue`

### Exit rules

The buffer lasts at most 4 generated turns and can end earlier based on the user’s selected moves:

- Strong restart path: exit after 2 post-ending turns
  - Triggered by choices such as `new_problem` or another clearly escalating restart move
- Medium restart path: exit after 3 post-ending turns
  - Triggered by moves such as `loose_thread` or `time_skip`
- Soft continuation path: exit after 4 post-ending turns
  - Triggered by quieter aftermath or reflection moves
- If the user selects `epilogue`, end the story again immediately

### Coherent return to normal pacing

The system must not clear the buffer and fall back to raw global turn count. That would place the story back into `falling` or `resolution` immediately and recreate the current problem.

Instead, once the buffer exits:

- switch into a resumed extension mode
- calculate beats from a segment-local turn count
- treat the buffer text as canon continuation
- reopen pacing from a sensible resumed point based on exit strength

Resume defaults:

- Strong restart exits resume around early `rising`
- Medium exits resume around late `rising`
- Soft exits resume around gentle early-to-mid `rising`

Default reopened segment targets:

- Strong restart: `extensionTargetTurns = 10`
- Medium restart: `extensionTargetTurns = 8`
- Soft restart: `extensionTargetTurns = 6`

## Expanded Move System

The system should keep exactly 4 visible choices per turn, but each phase should draw from a larger internal pool of narrative moves.

### Internal move families

- `investigate`
- `connect`
- `commit`
- `foreshadow`
- `reveal`
- `complicate`
- `risk`
- `bargain`
- `confront`
- `sacrifice`
- `regroup`
- `reflect`
- `resolve`
- `conclude`
- `epilogue`
- post-ending only: `aftermath`, `loose_thread`, `new_problem`, `time_skip`

### Visible labels

Visible labels stay simple and user-friendly:

- `Discovery`
- `Bond`
- `Crossroads`
- `Omen`
- `Reveal`
- `Complication`
- `Risk`
- `Showdown`
- `Sacrifice`
- `Recovery`
- `Conclusion`
- `Resolution`
- `Aftermath`
- `Epilogue`

`Aftermath` is post-ending only. `Epilogue` remains optional.
Multiple internal move ids may share one visible label if that keeps the UI simpler.

### Phase pools

Each phase should expose a pool of 5 to 7 eligible move families, from which the app selects 4 distinct families for the current turn.

Recommended starting pools:

- `setup`: `investigate`, `connect`, `commit`, `foreshadow`, `reveal`
- `rising`: `investigate`, `connect`, `risk`, `complicate`, `bargain`, `reveal`, `regroup`
- `climax`: `risk`, `confront`, `sacrifice`, `reveal`, `complicate`, `commit`
- `falling`: `reflect`, `regroup`, `resolve`, `reveal`, `conclude`
- `resolution`: `reflect`, `resolve`, `conclude`, `epilogue`

### Selection rules

- Always select exactly 4 distinct move families.
- Do not allow duplicates within a single choice set.
- Regeneration should rotate within the phase pool rather than paraphrasing the same exact family set every time.
- Recent selected move families should lightly suppress repetition for the next 1 to 2 turns unless the current story state strongly calls for recurrence.

This produces more variety while keeping the UI unchanged.

## Chapter Title Assist

AI chapter naming should be explicit, user-invoked, and non-destructive.

### V1 surface

Only the chapter list rename flow gets AI title generation in V1.

### Rename flow

When the user opens `Rename` from the chapter list:

- show the normal editable title field
- add `Generate title`
- add `Reroll`
- show one AI suggestion at a time
- add `Use suggestion`

Rules:

- The AI suggestion must not overwrite the current input automatically.
- The user can keep typing their own title.
- The chapter title changes only when the user confirms save.

### AI input context

The title-generation request should include:

- the target chapter text
- nearby active-path context
- story premise
- tone
- genre
- current summary
- current chapter title, if any

### Failure behavior

- If title generation fails, keep the rename flow open and allow manual rename.
- If save fails, keep both the typed input and the current suggestion intact.

## Data Model and Architecture

### Storage

Keep `target_turns` as the baseline original arc length.

Expand story-level arc state:

- `arc_override`: `null | "concluding" | "post_ending" | "resumed_extension"`
- new `arc_state` JSON field on `stories`

Recommended `arc_state` shape:

```ts
type ArcState = {
  segmentStartTurn: number;
  bufferTurnsUsed: number;
  endedWith: "conclude" | "epilogue" | null;
  resumeStrength: "soft" | "medium" | "strong" | null;
  extensionTargetTurns: number | null;
};
```

`story_state` should not hold this data because it is overwritten by summarization.

When a story ends, set `status = "completed"`.
When a user clicks `Continue anyway`, set `status = "in_progress"`, `arc_override = "post_ending"`, and seed `arc_state`.

### Shared move registry

Create one shared registry module that owns:

- internal move ids
- visible labels
- icon and color mapping
- phase pools
- post-ending pool
- restart-strength classification

This removes current duplication across `story-arc.ts`, `generate-choices.ts`, and `ChoiceCards.tsx`.

### Deterministic move selection

The app should choose the 4 move families first, then ask the model to generate labels and previews for those selected families.

The selector should account for:

- current phase
- current arc mode
- recent selected move families
- whether the previous ending was `epilogue`

This gives guaranteed variety and stronger control than relying on prompt-only filtering.

## API and Prompting

### Choice generation

Choice generation must accept the selected move-family list directly rather than inferring it only from phase.

The generation prompt should:

- describe the current arc mode
- tell the model whether this is post-ending continuation
- require one choice for each of the 4 preselected move families
- instruct the model to bridge coherently from the immediately previous text

### Section generation

Section generation should gain mode-aware pacing instructions:

- ordinary phase instructions for normal arc turns
- post-ending continuation instructions while the buffer is active
- resumed-extension instructions when normal pacing has reopened after the buffer

The post-ending prompt must explicitly tell the model:

- the story already reached a finished-feeling moment
- this continuation must reopen naturally from that ending
- new motion should emerge from consequences, loose threads, or renewed pressure

### Chapter title generation

Add a dedicated authenticated route for chapter title generation.

- request: chapter text plus supporting story context
- response: one suggested title
- reroll: same route, repeated request

This route should be separate from chapter-review suggestions because the use case is explicit rename assistance, not passive structure review.

## UI Notes

- Add a subtle `After the ending` indicator while in the post-ending buffer.
- Do not show the explicit extension-intent chooser in V1.
- Keep visible choice labels simple.
- Keep chapter title generation inside the chapter list rename UI only.

## Testing Scope

Add coverage for:

- move-family selection and anti-repetition behavior
- post-ending entry, exit, and resumed beat calculation
- `epilogue` suppression after an epilogue ending
- coherent choice-family reshaping after `Continue anyway`
- chapter-list `Generate title`, `Reroll`, and `Use suggestion`
- failure handling for title generation and save

Add one focused browser smoke for the continue-anyway extension flow after implementation.

## Rollout

Ship as one additive release. Existing stories continue working:

- stories without `arc_state` default to ordinary behavior
- completed stories can still be reopened
- chapter review remains unchanged except for the separate title-generation assist

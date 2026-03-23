
## Timeline + Chapter Reconciliation Plan

## What’s going wrong now

The app currently uses one tree for two different ideas:

1. **Narrative history / forks** — the timeline tree  
2. **Reading structure / chapters** — the chapter system

Right now every newly generated node becomes a child of the previous node, so the timeline depth keeps increasing forever. Then manual chapter splits also create child nodes, which makes chapter boundaries look like deeper branches even when they are really just structural breaks in the same storyline.

There are two core issues in the current code:

- **Chapter detection is too implicit**  
  A chapter start is inferred with `chosen_option == null`, which is fragile and mixes “opening”, “manual split”, and other cases.

- **Timeline depth is based on parent depth, not branch depth**  
  `depth = parent.depth + 1` makes a simple linear continuation look more and more nested, even when nothing actually forked.

## What I’ll change

### 1. Separate chapter semantics from timeline semantics
Add an explicit chapter marker to story nodes, instead of inferring it from `chosen_option`.

Recommended shape:
```text
story_nodes
  + starts_chapter boolean default false
```

Rules:
- opening node: `starts_chapter = true`
- manual split-created node: `starts_chapter = true`
- regular choice continuation: `starts_chapter = false`

This makes chapters stable and predictable.

### 2. Keep chapter UI driven only by chapter markers
Update `StoryWrite` so chapters/headings/sidebar are derived from:

```text
active nodes where starts_chapter = true
```

instead of:
```text
chosen_option == null
```

That keeps:
- normal choices extending the current chapter
- manual chapter breaks creating a real new chapter
- renamed chapter titles staying attached to real chapter-start nodes

### 3. Redesign timeline indentation so linear progress stays flat
Update `StoryTimeline` tree layout so indentation reflects **forking**, not simple continuation.

New display rule:
- if a node is just the single continuation of a chain, keep it at the same visual depth
- only increase indentation when a node comes from a branching point / alternate path

Effect:
- Opening → Section 2 → Section 3 stays visually aligned as one storyline
- actual branches/forks become nested
- chapter splits no longer make the timeline look like it is spiraling inward

### 4. Preserve split/merge behavior, but mark chapter boundaries properly
Update split/merge logic so chapter structure remains consistent:

- **split**  
  - original node stays in current chapter
  - new child node becomes `starts_chapter = true`
- **merge**
  - remove the child chapter boundary
  - keep parent as the chapter start if appropriate
- **normal generation after a split**
  - new node continues from the current tip
  - does not create a new chapter
  - does not increase timeline nesting unless it’s a real fork

### 5. Improve timeline labels so they match the mental model
Adjust timeline naming so it reads like history, not chapters.

Example approach:
- first node: `Opening`
- regular continuation: chosen option label or `Continuation`
- split-created chapter boundary: small badge like `Chapter break`
- real alternate branch: `Fork`

That keeps the Timeline about history, while Chapters remains about structure.

## Files I’d update

- `src/pages/StoryWrite.tsx`
  - derive chapters from explicit chapter-start metadata
  - keep timeline data separate from chapter data
- `src/components/story/StoryTimeline.tsx`
  - replace current parent-depth indentation with branch-aware indentation
  - improve labels / badges for split vs fork
- `src/lib/story-api.ts`
  - set explicit chapter-start metadata on opening and split nodes
  - preserve it correctly on merge/delete flows
- database migration
  - add `starts_chapter` boolean to `story_nodes`

## Expected result

After this fix:

- generating the next section will **continue the current chapter**
- inserting a chapter break will create a **real new chapter**
- the timeline will no longer drift deeper and deeper for normal progression
- only true forks will appear nested
- chapter sidebar, canvas headings, and timeline will all stay in sync

## Technical note

The cleanest mental model is:

```text
story_nodes = history graph
starts_chapter = reading structure marker
timeline depth = branch depth, not ancestry length
```

That separation is what will stop chapter splits and timeline nesting from fighting each other.

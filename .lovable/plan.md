

# Chapter Management — Plan

## Current State

Chapters are **not a real data entity**. They are derived on-the-fly from active `story_nodes` — each node becomes a "chapter" in the sidebar, with titles pulled from the chosen direction label (e.g. "Opening", "Section 2"). There is no database column for chapter title, chapter number, or chapter boundaries. Users cannot rename, reorder, delete, or manually insert chapter breaks.

## What We'll Build

### User Experience

1. **Rename a chapter** — Right-click (or click a "..." menu) on any chapter in the sidebar → "Rename". Inline editable text field saves a custom title to the node.

2. **Delete a chapter** — Same context menu → "Delete". Removes the node and all its descendants from the active branch, then re-activates the parent as the new tip. Confirmation dialog before deletion.

3. **Insert chapter break** — Inside the story canvas, a subtle "Insert chapter break" divider appears between paragraphs on hover. Clicking it splits the current node's text at that point into two nodes (parent → child), creating a visible chapter boundary.

4. **Merge with previous** — Context menu option that combines a node's text with its parent node, removing the chapter boundary.

5. **Chapter title display** — Chapter titles appear as styled headings in the canvas between sections, making the structure visible while reading/writing.

### Data Changes

Add a `chapter_title` column to `story_nodes`:

```text
story_nodes
  + chapter_title (text, nullable, default null)
```

When `chapter_title` is set, the sidebar and canvas use it. Otherwise fall back to the current derived title ("Opening", chosen label, or "Section N").

### Implementation Steps

1. **Database migration** — Add `chapter_title` column to `story_nodes`.

2. **API layer** — Add `updateNodeChapterTitle(nodeId, title)` and `deleteNodeAndDescendants(storyId, nodeId)` and `splitNodeAtPosition(storyId, nodeId, splitIndex)` and `mergeNodeWithParent(storyId, nodeId)` functions to `story-api.ts`.

3. **ChapterSidebar upgrades** — Add a context menu (right-click or "..." icon) per chapter with Rename, Delete, and Merge options. Inline editing for rename. Confirmation dialog for delete.

4. **StoryCanvas chapter breaks** — Render chapter title headings between node boundaries in the canvas. Add hover-triggered "insert break" buttons between paragraphs within a single node.

5. **StoryWrite wiring** — Connect the new sidebar actions to API calls, refresh state after mutations, handle edge cases (can't delete the only node, can't merge the root node).

6. **Tests** — Add E2E tests for rename, delete, and chapter break insertion flows.

### Technical Details

- **Delete logic**: Walk the node tree to find all descendants of the target node, deactivate or hard-delete them, then set the parent node as the new active tip.
- **Split logic**: Given a node and a paragraph index, create a new child node with the text after the split point, update the original node's text to only contain text before the split.
- **Merge logic**: Append the child node's text to the parent, re-parent the child's children to the parent, then delete the child node.
- Context menu uses the existing shadcn `DropdownMenu` component.


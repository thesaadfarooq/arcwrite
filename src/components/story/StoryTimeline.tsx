import { useState } from "react";
import { GitBranch, Circle, ChevronRight, RotateCcw, Trash2, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface TimelineNode {
  id: string;
  parentId: string | null;
  chosenLabel: string | null;
  createdAt: string;
  isActive: boolean;
  wordCount: number;
  startsChapter?: boolean;
}

interface StoryTimelineProps {
  nodes: TimelineNode[];
  currentNodeId: string | null;
  onJumpToNode: (nodeId: string) => void;
  onForkFromNode: (nodeId: string) => void;
  totalWords: number;
  storyTitle: string;
  embedded?: boolean;
}

interface TreeNode extends TimelineNode {
  children: TreeNode[];
  depth: number;
}

function buildTree(nodes: TimelineNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  nodes.forEach((n) => map.set(n.id, { ...n, children: [], depth: 0 }));

  nodes.forEach((n) => {
    const treeNode = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      const parent = map.get(n.parentId)!;
      parent.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  });

  return roots;
}

/**
 * Branch-aware depth: only increase visual depth when a node is part of
 * a fork (its parent has multiple children). Linear continuations stay flat.
 */
function assignBranchDepth(roots: TreeNode[]) {
  function walk(node: TreeNode, depth: number) {
    node.depth = depth;
    if (node.children.length === 1) {
      // Single continuation — keep same depth
      walk(node.children[0], depth);
    } else {
      // Fork point — children get +1 depth
      node.children.forEach((child) => walk(child, depth + 1));
    }
  }
  roots.forEach((r) => walk(r, 0));
}

function flattenTree(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  function walk(node: TreeNode) {
    result.push(node);
    node.children.forEach(walk);
  }
  roots.forEach(walk);
  return result;
}

export function StoryTimeline({
  nodes,
  currentNodeId,
  onJumpToNode,
  onForkFromNode,
  totalWords,
  storyTitle,
  embedded = false,
}: StoryTimelineProps) {
  const tree = buildTree(nodes);
  assignBranchDepth(tree);
  const flat = flattenTree(tree);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      {!embedded ? (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-primary" />
            <span className="font-story font-semibold text-foreground text-sm">Timeline</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {nodes.length} node{nodes.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words
          </div>
        </div>
      ) : null}

      {/* Node list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {flat.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            Story nodes will appear as you write
          </div>
        ) : (
          <div className="space-y-0.5">
            {flat.map((node, i) => {
              const isCurrent = node.id === currentNodeId;
              const isOnActivePath = node.isActive;
              const hasMultipleChildren =
                nodes.filter((n) => n.parentId === node.id).length > 1;

              // Determine label
              let label: string;
              if (i === 0) {
                label = "Opening";
              } else if (node.chosenLabel) {
                label = node.chosenLabel;
              } else if (node.startsChapter) {
                label = "Chapter break";
              } else {
                label = `Continuation`;
              }

              return (
                <div key={node.id} style={{ paddingLeft: `${node.depth * 16}px` }}>
                  <button
                    type="button"
                    onClick={() => onJumpToNode(node.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 group active:scale-[0.97] ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : isOnActivePath
                        ? "text-foreground hover:bg-secondary"
                        : "text-muted-foreground/60 hover:bg-secondary hover:text-muted-foreground"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Circle
                        className={`w-3 h-3 ${
                          isCurrent
                            ? "text-primary fill-primary"
                            : isOnActivePath
                            ? "text-primary/50"
                            : "text-muted-foreground/30"
                        }`}
                      />
                      {hasMultipleChildren && (
                        <GitBranch className="w-2.5 h-2.5 text-accent absolute -right-1.5 -bottom-1" />
                      )}
                    </div>

                    <span className="truncate flex-1 text-xs flex items-center gap-1.5">
                      {label}
                      {node.startsChapter && i > 0 && (
                        <BookOpen className="w-3 h-3 text-primary/60 shrink-0" />
                      )}
                    </span>

                    <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity tabular-nums shrink-0">
                      {node.wordCount}w
                    </span>
                  </button>

                  {/* Fork action on hover for non-current nodes */}
                  {!isCurrent && (
                    <div className={`${embedded ? "flex" : "hidden group-hover:flex"} items-center gap-1 ml-7 mt-0.5`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onForkFromNode(node.id);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Fork here
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

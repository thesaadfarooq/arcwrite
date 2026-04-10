import { useCallback, useMemo, useState } from "react";
import { BookOpen, CornerDownLeft, Shield, Flame, Heart, Zap } from "lucide-react";
import { DemoGraph } from "@/components/demo/DemoGraph";
import type { DemoNode } from "@/lib/demo-stories";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DemoStoryViewerProps {
  nodes: DemoNode[];
  title: string;
  className?: string;
}

// ─── Choice styling ──────────────────────────────────────────────────────────

const CHOICE_META: Record<string, { icon: typeof Shield; color: string; bg: string }> = {
  safe:      { icon: Shield, color: "hsl(var(--choice-safe))",      bg: "hsl(var(--choice-safe) / 0.1)" },
  risky:     { icon: Flame,  color: "hsl(var(--choice-risky))",     bg: "hsl(var(--choice-risky) / 0.1)" },
  emotional: { icon: Heart,  color: "hsl(var(--choice-emotional))", bg: "hsl(var(--choice-emotional) / 0.1)" },
  chaotic:   { icon: Zap,    color: "hsl(var(--choice-chaotic))",   bg: "hsl(var(--choice-chaotic) / 0.1)" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DemoStoryViewer({ nodes, title, className }: DemoStoryViewerProps) {
  const rootNode = nodes.find((n) => n.parentId === null)!;
  const [selectedNodeId, setSelectedNodeId] = useState<string>(rootNode.id);

  // Track which nodes have been revealed (grows as user makes choices)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    initial.add(rootNode.id);
    // Also reveal root's children (the first set of choices)
    nodes.filter((n) => n.parentId === rootNode.id).forEach((n) => initial.add(n.id));
    return initial;
  });

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? rootNode;

  // Build path from root → selected node
  const pathNodes = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const path: DemoNode[] = [];
    let cur: DemoNode | undefined = selectedNode;
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
  }, [nodes, selectedNode]);

  // Children of selected node = available choices
  const children = useMemo(
    () => nodes.filter((n) => n.parentId === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const totalWords = pathNodes.reduce((sum, n) => sum + n.wordCount, 0);

  // When user picks a choice, reveal that node + its children
  const handleChoiceSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      nodes.filter((n) => n.parentId === nodeId).forEach((n) => next.add(n.id));
      return next;
    });
  }, [nodes]);

  // When user clicks a node in the tree (revert)
  const handleTreeNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    // Reveal its children if not already
    setRevealedIds((prev) => {
      const next = new Set(prev);
      nodes.filter((n) => n.parentId === nodeId).forEach((n) => next.add(n.id));
      return next;
    });
  }, [nodes]);

  return (
    <div className={`flex flex-col lg:flex-row gap-4${className ? ` ${className}` : ""}`}>
      {/* ── Editor panel (left) ──────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2 px-1">
          Choose what happens next — the AI writes each turn.
        </p>
        <div className="rounded-xl border border-border bg-card flex-1 flex flex-col">
          {/* Editor chrome header */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-story text-sm font-medium text-foreground">{title}</span>
            {selectedNode.startsChapter && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                Chapter start
              </span>
            )}
            <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium">
              {totalWords} words
            </span>
          </div>

          {/* Story text */}
          <div className="px-5 py-4 space-y-3 max-h-[260px] overflow-y-auto flex-1">
            {pathNodes.map((node, i) => (
              <p
                key={node.id}
                className={`font-story text-sm leading-relaxed ${
                  i < pathNodes.length - 1 ? "text-foreground/40" : "text-foreground/80"
                }`}
              >
                {node.text}
              </p>
            ))}
          </div>

          {/* Choices or end-of-path */}
          <div className="px-5 py-4 border-t border-border/50">
            {children.length > 0 ? (
              <>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  What happens next?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {children.map((child) => {
                    const meta = child.chosenType ? CHOICE_META[child.chosenType] : null;
                    const Icon = meta?.icon;
                    return (
                      <button
                        key={child.id}
                        onClick={() => handleChoiceSelect(child.id)}
                        className="p-3 rounded-lg border border-border bg-background hover:bg-muted/50 hover:border-primary/30 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {Icon && (
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: meta!.bg, color: meta!.color }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                          )}
                          {child.chosenType && (
                            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                              {child.chosenType}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                          {child.chosenLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-3">End of this path</p>
                {selectedNode.parentId && (
                  <button
                    onClick={() => handleTreeNodeSelect(selectedNode.parentId!)}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    Go back and try another path
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tree panel (right) ───────────────────────────── */}
      <div className="flex-1 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2 px-1">
          Click any node to revert — explore different paths your story could take.
        </p>
        <div className="rounded-xl border border-border bg-card flex-1 min-h-[320px] lg:min-h-0">
          <DemoGraph
            nodes={nodes}
            selectedNodeId={selectedNodeId}
            onNodeSelect={handleTreeNodeSelect}
            revealedNodeIds={revealedIds}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}

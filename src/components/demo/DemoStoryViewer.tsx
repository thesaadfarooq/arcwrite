import { useState } from "react";
import { BookOpen } from "lucide-react";
import { DemoGraph } from "@/components/demo/DemoGraph";
import type { DemoNode } from "@/lib/demo-stories";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DemoStoryViewerProps {
  nodes: DemoNode[];
  title: string;
  className?: string;
}

// ─── Choice type pill colours ─────────────────────────────────────────────────

const choiceTypeColors: Record<string, string> = {
  safe: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  risky: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  emotional: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  chaotic: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DemoStoryViewer({ nodes, title, className }: DemoStoryViewerProps) {
  const rootNode = nodes.find((n) => n.parentId === null)!;
  const [selectedNodeId, setSelectedNodeId] = useState<string>(rootNode.id);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? rootNode;
  const isRoot = selectedNode.parentId === null;

  return (
    <div
      className={`flex flex-col md:flex-row gap-4${className ? ` ${className}` : ""}`}
    >
      {/* Graph panel */}
      <div className="flex-1 min-h-[280px] md:min-h-[360px] rounded-lg border bg-card overflow-hidden">
        <DemoGraph
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          className="w-full h-full"
        />
      </div>

      {/* Reading panel */}
      <div className="flex-[1.2] rounded-lg border bg-card p-5 md:p-6 flex flex-col gap-3">
        {/* Header bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm text-foreground">{title}</span>
          {selectedNode.startsChapter && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Chapter start
            </span>
          )}
        </div>

        {/* Choice info (non-root only) */}
        {!isRoot && selectedNode.chosenLabel && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Choice made:</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                selectedNode.chosenType
                  ? (choiceTypeColors[selectedNode.chosenType] ?? "bg-muted text-muted-foreground")
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {selectedNode.chosenLabel}
            </span>
            {selectedNode.chosenType && (
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                {selectedNode.chosenType}
              </span>
            )}
          </div>
        )}

        {/* Story text */}
        <p className="font-story text-sm leading-relaxed text-foreground/80 flex-1">
          {selectedNode.text}
        </p>

        {/* Word count */}
        <p className="text-xs text-muted-foreground">
          {selectedNode.wordCount} words
        </p>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { BranchGraph, type GraphNode } from "@/components/story/BranchGraph";
import type { Branch } from "@/lib/branch-api";

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 380;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExplorePaneProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: GraphNode[];
  branches: Branch[];
  currentNodeId: string | null;
  mainBranchId: string | null;
  isGenerating?: boolean;
  jumpingNodeId?: string | null;
  onNodeClick: (nodeId: string) => void;
  onBranchFromNode: (nodeId: string) => void;
  onPromoteBranch: (branchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
  onExpandToFullPage: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExplorePane({
  isOpen,
  onClose,
  nodes,
  branches,
  currentNodeId,
  mainBranchId,
  isGenerating,
  jumpingNodeId,
  onNodeClick,
  onBranchFromNode,
  onPromoteBranch,
  onDeleteBranch,
  onExpandToFullPage,
}: ExplorePaneProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current) return;
    const delta = dragStateRef.current.startX - e.clientX;
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStateRef.current.startWidth + delta));
    setWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    dragStateRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const handleDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStateRef.current = { startX: e.clientX, startWidth: width };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [width, handleMouseMove, handleMouseUp],
  );

  // Clean up global listeners if the pane is closed mid-drag
  useEffect(() => {
    if (!isOpen) {
      handleMouseUp();
    }
  }, [isOpen, handleMouseUp]);

  if (!isOpen) return null;

  return (
    <div
      className="relative flex h-full shrink-0 border-l border-border bg-card/50 animate-fade-in"
      style={{ width }}
    >
      {/* Drag handle — left edge */}
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-10"
        onMouseDown={handleDragMouseDown}
      />

      {/* Graph content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <BranchGraph
          nodes={nodes}
          branches={branches}
          currentNodeId={currentNodeId}
          mainBranchId={mainBranchId}
          isGenerating={isGenerating}
          jumpingNodeId={jumpingNodeId}
          onClose={onClose}
          onNodeClick={onNodeClick}
          onBranchFromNode={onBranchFromNode}
          onPromoteBranch={onPromoteBranch}
          onDeleteBranch={onDeleteBranch}
          onExpandToFullPage={onExpandToFullPage}
        />
      </div>
    </div>
  );
}

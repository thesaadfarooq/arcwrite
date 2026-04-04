import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Position,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  BackgroundVariant,
} from "@xyflow/react";
import dagre from "dagre";
import { Focus, GitBranch, Maximize2, X } from "lucide-react";
import type { Branch } from "@/lib/branch-api";
import "@xyflow/react/dist/style.css";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  parentId: string | null;
  branchId: string | null;
  chosenLabel: string | null;
  chosenType: string | null;
  chosenPreview: string | null;
  wordCount: number;
  isActive: boolean;
  startsChapter: boolean;
}

interface BranchGraphProps {
  nodes: GraphNode[];
  branches: Branch[];
  currentNodeId: string | null;
  mainBranchId: string | null;
  isGenerating?: boolean;
  jumpingNodeId?: string | null;
  onClose?: () => void;
  onNodeClick: (nodeId: string) => void;
  onBranchFromNode: (nodeId: string) => void;
  onPromoteBranch: (branchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
  onExpandToFullPage?: () => void;
}

// ─── Dagre layout ────────────────────────────────────────────────────────────

const NODE_WIDTH = 28;
const NODE_HEIGHT = 28;

function layoutGraph(
  graphNodes: GraphNode[],
  currentNodeId: string | null,
  activePath: Set<string>,
  isGenerating: boolean,
  jumpingNodeId: string | null,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 50,
    marginx: 24,
    marginy: 24,
  });

  graphNodes.forEach((gn) => {
    g.setNode(gn.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  graphNodes.forEach((gn) => {
    if (gn.parentId) {
      g.setEdge(gn.parentId, gn.id);
    }
  });

  dagre.layout(g);

  const rfNodes: Node[] = graphNodes.map((gn) => {
    const pos = g.node(gn.id);
    const isCurrent = gn.id === currentNodeId;
    const isOnActive = activePath.has(gn.id);
    const isRoot = !gn.parentId;

    return {
      id: gn.id,
      type: "storyNode",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        label: gn.chosenLabel,
        chosenType: gn.chosenType,
        chosenPreview: gn.chosenPreview,
        wordCount: gn.wordCount,
        isCurrent,
        isOnActive,
        isRoot,
        startsChapter: gn.startsChapter,
        branchId: gn.branchId,
        isGenerating: isCurrent && isGenerating,
        isJumping: gn.id === jumpingNodeId,
      },
    };
  });

  const rfEdges: Edge[] = graphNodes
    .filter((gn) => gn.parentId)
    .map((gn) => {
      const bothActive = activePath.has(gn.id) && activePath.has(gn.parentId!);
      return {
        id: `e-${gn.parentId}-${gn.id}`,
        source: gn.parentId!,
        target: gn.id,
        type: "smoothstep",
        style: {
          stroke: bothActive
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground) / 0.25)",
          strokeWidth: bothActive ? 2 : 1,
        },
        animated: bothActive,
      };
    });

  return { rfNodes, rfEdges };
}

// ─── Custom node ─────────────────────────────────────────────────────────────

type StoryNodeData = {
  label: string | null;
  chosenType: string | null;
  chosenPreview: string | null;
  wordCount: number;
  isCurrent: boolean;
  isOnActive: boolean;
  isRoot: boolean;
  startsChapter: boolean;
  branchId: string | null;
  isGenerating: boolean;
  isJumping: boolean;
};

const TOOLTIP_WIDTH = 180;

function StoryNodeComponent({ data }: NodeProps<Node<StoryNodeData>>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isCurrent, isOnActive, isRoot, startsChapter, label, chosenType, chosenPreview, wordCount, isGenerating, isJumping } = data;

  const size = isCurrent ? 16 : isOnActive ? 12 : 9;
  const displayLabel = label ?? (isRoot ? "Story opening" : "Continuation");
  const typeLabel = chosenType?.replace(/_/g, " ") ?? null;
  const trimmedPreview = useMemo(() => {
    if (!chosenPreview) return null;
    const words = chosenPreview.split(/\s+/);
    return words.length > 12 ? words.slice(0, 12).join(" ") + "..." : chosenPreview;
  }, [chosenPreview]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400);
  }, [clearLongPress]);

  const handleTouchEnd = useCallback(() => {
    clearLongPress();
    if (showTooltip) {
      setTimeout(() => setShowTooltip(false), 2000);
    }
  }, [clearLongPress, showTooltip]);

  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; flipLeft: boolean } | null>(null);

  const computeTooltipPos = useCallback(() => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const flip = spaceRight < TOOLTIP_WIDTH + 16;
    setTooltipPos({
      top: rect.top + rect.height / 2,
      left: flip ? rect.left - 6 : rect.right + 6,
      flipLeft: flip,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    computeTooltipPos();
    setShowTooltip(true);
  }, [computeTooltipPos]);

  const handleTouchStartWrapped = useCallback(() => {
    computeTooltipPos();
    handleTouchStart();
  }, [computeTooltipPos, handleTouchStart]);

  return (
    <div
      ref={nodeRef}
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={handleTouchStartWrapped}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { clearLongPress(); setShowTooltip(false); }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* Chapter dot */}
      {startsChapter && (
        <div
          className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: "hsl(var(--primary) / 0.7)" }}
        />
      )}

      {/* Generating spinner ring */}
      {isGenerating && (
        <div
          className="absolute rounded-full animate-spin"
          style={{
            width: size + 12,
            height: size + 12,
            border: "2px solid transparent",
            borderTopColor: "hsl(var(--primary))",
            borderRightColor: "hsl(var(--primary) / 0.3)",
          }}
        />
      )}

      {/* Jumping spinner ring */}
      {isJumping && !isGenerating && (
        <div
          className="absolute rounded-full animate-spin"
          style={{
            width: size + 10,
            height: size + 10,
            border: "1.5px solid transparent",
            borderTopColor: "hsl(var(--foreground) / 0.5)",
            borderRightColor: "hsl(var(--foreground) / 0.15)",
          }}
        />
      )}

      {/* Current node glow */}
      {isCurrent && !isGenerating && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: size + 10,
            height: size + 10,
            background: "hsl(var(--primary) / 0.1)",
          }}
        />
      )}

      {/* Node dot */}
      <div
        className="rounded-full transition-all duration-200 ease-out"
        style={{
          width: showTooltip ? size + 3 : size,
          height: showTooltip ? size + 3 : size,
          background: isJumping
            ? "hsl(var(--primary) / 0.6)"
            : isGenerating
              ? "hsl(var(--primary) / 0.4)"
              : isCurrent
                ? "hsl(var(--primary))"
                : isOnActive
                  ? "hsl(var(--primary) / 0.55)"
                  : "hsl(var(--muted-foreground) / 0.3)",
          boxShadow: showTooltip
            ? "0 0 8px 2px hsl(var(--primary) / 0.2)"
            : "none",
          border: isCurrent && !isGenerating
            ? "2px solid hsl(var(--primary-foreground) / 0.4)"
            : "none",
        }}
      />

      {/* Root inner dot */}
      {isRoot && !isCurrent && (
        <div
          className="absolute rounded-full"
          style={{ width: 3, height: 3, background: "hsl(var(--background))" }}
        />
      )}

      {/* Tooltip — portalled to body so it's outside React Flow's zoom transform */}
      {showTooltip && tooltipPos && createPortal(
        <div
          className="pointer-events-none animate-in fade-in-0 duration-100"
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.flipLeft ? tooltipPos.left : tooltipPos.left,
            transform: tooltipPos.flipLeft
              ? "translate(-100%, -50%)"
              : "translateY(-50%)",
            width: TOOLTIP_WIDTH,
            zIndex: 9999,
          }}
        >
          <div className="bg-popover border border-border rounded-md shadow-md px-2 py-1.5 text-[11px]">
            <div className="font-medium text-foreground flex items-center gap-1">
              <span className="break-words leading-snug">{displayLabel}</span>
              {isCurrent && (
                <span className="text-[8px] shrink-0 font-normal bg-primary/15 text-primary px-1 py-px rounded-full">
                  {isGenerating ? "writing..." : "now"}
                </span>
              )}
            </div>
            {typeLabel && (
              <div className="text-[9px] uppercase tracking-wide text-primary/70 font-medium mt-0.5">
                {typeLabel}
              </div>
            )}
            {trimmedPreview && (
              <div className="text-muted-foreground leading-snug mt-0.5 break-words">
                {trimmedPreview}
              </div>
            )}
            <div className="text-muted-foreground/50 text-[9px] mt-1">
              {wordCount}w{startsChapter ? " · chapter start" : ""}
            </div>
            {!isCurrent && (
              <div className="text-primary text-[10px] font-medium mt-1 pt-1 border-t border-border/50">
                {window.innerWidth < 768 ? "Tap" : "Click"} to jump to "{displayLabel.length > 20 ? displayLabel.slice(0, 20) + "…" : displayLabel}"
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  storyNode: StoryNodeComponent,
};

// ─── Context menu ────────────────────────────────────────────────────────────

interface ContextMenuState {
  nodeId: string;
  branchId: string | null;
  isOnActive: boolean;
  x: number;
  y: number;
}

// ─── Inner component (needs ReactFlowProvider above) ─────────────────────────

function BranchGraphInner({
  nodes: graphNodes,
  branches,
  currentNodeId,
  mainBranchId,
  isGenerating = false,
  jumpingNodeId = null,
  onClose,
  onNodeClick,
  onBranchFromNode,
  onPromoteBranch,
  onDeleteBranch,
  onExpandToFullPage,
}: BranchGraphProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showHint, setShowHint] = useState(true);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, [showHint]);

  const activePath = useMemo(() => {
    const set = new Set<string>();
    if (!currentNodeId) return set;
    const byId = new Map(graphNodes.map((n) => [n.id, n]));
    let cur: string | null = currentNodeId;
    while (cur) {
      set.add(cur);
      cur = byId.get(cur)?.parentId ?? null;
    }
    return set;
  }, [graphNodes, currentNodeId]);

  const { rfNodes, rfEdges } = useMemo(
    () => layoutGraph(graphNodes, currentNodeId, activePath, isGenerating, jumpingNodeId),
    [graphNodes, currentNodeId, activePath, isGenerating, jumpingNodeId],
  );

  useEffect(() => {
    if (rfNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.5, duration: 300 }), 50);
    }
  }, [rfNodes.length, fitView]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  const handleNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: Node<StoryNodeData>) => {
      e.preventDefault();
      setContextMenu({
        nodeId: node.id,
        branchId: node.data.branchId,
        isOnActive: node.data.isOnActive,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-xs text-foreground">Explore</span>
          <span className="text-[10px] text-muted-foreground">
            {graphNodes.length} node{graphNodes.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fitView({ padding: 0.5, duration: 300 })}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Center view"
          >
            <Focus className="w-3.5 h-3.5" />
          </button>
          {onExpandToFullPage && (
            <button
              type="button"
              onClick={onExpandToFullPage}
              className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Full page"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close explore panel"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hint */}
      {showHint && rfNodes.length > 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground bg-secondary/50 border-b border-border animate-in fade-in-0 duration-200">
          Click a node to jump to that point · hover to preview
        </div>
      )}

      {/* Graph */}
      <div className="flex-1 min-h-0">
        {rfNodes.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No nodes yet. Start writing to see your story graph here.
          </div>
        ) : (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            onNodeContextMenu={handleNodeContextMenu}
            fitView
            fitViewOptions={{ padding: 0.5 }}
            minZoom={0.3}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnScroll
            zoomOnScroll
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={0.8}
              color="hsl(var(--muted-foreground) / 0.08)"
            />
          </ReactFlow>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          data-context-menu
          className="fixed z-[100] bg-popover border border-border rounded-md shadow-lg py-0.5 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-secondary transition-colors text-foreground"
            onClick={() => { onNodeClick(contextMenu.nodeId); setContextMenu(null); }}
          >
            Jump to this point
          </button>
          {contextMenu.isOnActive && (
            <button
              type="button"
              className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-secondary transition-colors text-foreground"
              onClick={() => { onBranchFromNode(contextMenu.nodeId); setContextMenu(null); }}
            >
              Branch from here
            </button>
          )}
          {!contextMenu.isOnActive && contextMenu.branchId && (
            <>
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-secondary transition-colors text-foreground"
                onClick={() => { onPromoteBranch(contextMenu.branchId!); setContextMenu(null); }}
              >
                Set as main branch
              </button>
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { onDeleteBranch(contextMenu.branchId!); setContextMenu(null); }}
              >
                Delete branch
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Wrapper with provider ───────────────────────────────────────────────────

export function BranchGraph(props: BranchGraphProps) {
  return (
    <ReactFlowProvider>
      <BranchGraphInner {...props} />
    </ReactFlowProvider>
  );
}

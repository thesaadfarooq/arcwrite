import { useMemo, useState } from "react";
import dagre from "dagre";
import type { DemoNode } from "@/lib/demo-stories";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DemoGraphProps {
  nodes: DemoNode[];
  selectedNodeId: string;
  onNodeSelect: (id: string) => void;
  animated?: boolean;
  className?: string;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

interface TooltipState {
  nodeId: string;
  x: number;
  y: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 28;
const NODE_H = 28;
const PADDING = 8;
const DOT_GAP = 20;
const DOT_SIZE = 0.8;

// ─── Dagre layout ─────────────────────────────────────────────────────────────

function computeLayout(nodes: DemoNode[]): {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
} {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 40,
    ranksep: 50,
    marginx: 24,
    marginy: 24,
  });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  });
  nodes.forEach((n) => {
    if (n.parentId) g.setEdge(n.parentId, n.id);
  });

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  let maxX = 0;
  let maxY = 0;

  nodes.forEach((n) => {
    const pos = g.node(n.id);
    positions.set(n.id, { x: pos.x, y: pos.y });
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y > maxY) maxY = pos.y;
  });

  return {
    positions,
    width: maxX + NODE_W / 2 + PADDING,
    height: maxY + NODE_H / 2 + PADDING,
  };
}

// ─── Depth helper ─────────────────────────────────────────────────────────────

function computeDepths(nodes: DemoNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depths = new Map<string, number>();

  const getDepth = (id: string): number => {
    if (depths.has(id)) return depths.get(id)!;
    const node = byId.get(id);
    if (!node?.parentId) {
      depths.set(id, 0);
      return 0;
    }
    const d = getDepth(node.parentId) + 1;
    depths.set(id, d);
    return d;
  };

  nodes.forEach((n) => getDepth(n.id));
  return depths;
}

// ─── Active path helper ───────────────────────────────────────────────────────

function computeActivePath(nodes: DemoNode[], selectedNodeId: string): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const set = new Set<string>();
  let cur: string | null = selectedNodeId;
  while (cur) {
    set.add(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return set;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DemoGraph({
  nodes,
  selectedNodeId,
  onNodeSelect,
  animated = false,
  className,
}: DemoGraphProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Compute layout
  const { positions, width, height } = useMemo(() => computeLayout(nodes), [nodes]);

  // Compute active path
  const activePath = useMemo(
    () => computeActivePath(nodes, selectedNodeId),
    [nodes, selectedNodeId],
  );

  // Compute depths for animation stagger
  const depths = useMemo(() => (animated ? computeDepths(nodes) : new Map<string, number>()), [nodes, animated]);

  // viewBox with a little padding around the graph
  const viewBox = `0 0 ${width} ${height}`;

  // Find hovered node for tooltip data
  const hoveredNode = tooltip ? nodes.find((n) => n.id === tooltip.nodeId) : null;

  return (
    <div className={`relative${className ? ` ${className}` : ""}`}>
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Dot background */}
        <defs>
          <pattern
            id="demo-dot-pattern"
            x="0"
            y="0"
            width={DOT_GAP}
            height={DOT_GAP}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={DOT_GAP / 2}
              cy={DOT_GAP / 2}
              r={DOT_SIZE}
              fill="hsl(var(--muted-foreground) / 0.08)"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#demo-dot-pattern)" />

        {/* Edges */}
        {nodes
          .filter((n) => n.parentId !== null)
          .map((n) => {
            const from = positions.get(n.parentId!)!;
            const to = positions.get(n.id)!;
            const bothActive = activePath.has(n.id) && activePath.has(n.parentId!);
            const edgeStyle = animated
              ? {
                  opacity: 0,
                  animation: `fade-in 0.4s ${(depths.get(n.id) ?? 0) * 0.3}s forwards`,
                }
              : undefined;

            return (
              <line
                key={`e-${n.parentId}-${n.id}`}
                className="demo-edge"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={
                  bothActive
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground) / 0.25)"
                }
                strokeWidth={bothActive ? 2 : 1}
                style={edgeStyle}
              />
            );
          })}

        {/* Nodes */}
        {nodes.map((n) => {
          const pos = positions.get(n.id);
          if (!pos) return null;

          const isSelected = n.id === selectedNodeId;
          const isOnActivePath = activePath.has(n.id);
          const depth = depths.get(n.id) ?? 0;

          const radius = isSelected ? 8 : isOnActivePath ? 6 : 4.5;
          const fill = isSelected
            ? "hsl(var(--primary))"
            : isOnActivePath
              ? "hsl(var(--primary) / 0.55)"
              : "hsl(var(--muted-foreground) / 0.3)";

          const nodeStyle = animated
            ? {
                opacity: 0,
                animation: `fade-in 0.4s ${depth * 0.3}s forwards`,
              }
            : undefined;

          const classes = [
            "demo-node",
            isSelected ? "selected" : "",
            isOnActivePath ? "on-active-path" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <g
              key={n.id}
              data-node-id={n.id}
              className={classes}
              onClick={() => onNodeSelect(n.id)}
              onMouseEnter={() => setTooltip({ nodeId: n.id, x: pos.x, y: pos.y })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer", ...nodeStyle }}
            >
              {/* Glow circle for selected node */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 5}
                  fill="hsl(var(--primary) / 0.1)"
                />
              )}
              {/* Stroke ring for selected node */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 2}
                  fill="none"
                  stroke="hsl(var(--primary) / 0.4)"
                  strokeWidth={1.5}
                />
              )}
              {/* Main node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={fill}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && hoveredNode && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-50"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
            transform: "translate(12px, -50%)",
          }}
        >
          <div className="bg-popover border border-border rounded-md shadow-md px-2 py-1.5 text-[11px] min-w-[140px] max-w-[180px]">
            <div className="font-medium text-foreground leading-snug">
              {hoveredNode.chosenLabel ?? "Story opening"}
            </div>
            {hoveredNode.chosenType && (
              <div className="text-[9px] uppercase tracking-wide text-primary/70 font-medium mt-0.5">
                {hoveredNode.chosenType.toUpperCase()}
              </div>
            )}
            <div className="text-muted-foreground/50 text-[9px] mt-1">
              {hoveredNode.wordCount}w
              {hoveredNode.startsChapter ? " · chapter start" : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

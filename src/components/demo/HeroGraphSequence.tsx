import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

export interface HeroGraphSequenceProps {
  triggered: boolean;
  /** Called when the full animation sequence finishes */
  onComplete?: () => void;
}

// ─── Tree layout (symmetric, hand-crafted) ────────────────────────────────────

const NODES = [
  { x: 150, y: 25, depth: 0 },   // 0: root
  { x: 80, y: 105, depth: 1 },   // 1: L
  { x: 220, y: 105, depth: 1 },  // 2: R
  { x: 45, y: 185, depth: 2 },   // 3: LL
  { x: 115, y: 185, depth: 2 },  // 4: LR
  { x: 185, y: 185, depth: 2 },  // 5: RL
  { x: 255, y: 185, depth: 2 },  // 6: RR
];

const EDGES = [
  { from: 0, to: 1 }, // 0: root→L
  { from: 0, to: 2 }, // 1: root→R
  { from: 1, to: 3 }, // 2: L→LL
  { from: 1, to: 4 }, // 3: L→LR
  { from: 2, to: 5 }, // 4: R→RL
  { from: 2, to: 6 }, // 5: R→RR
];

// Cursor stops along the active path: root → L → LL
const STOPS = [
  { nodeIdx: 0, label: null, type: null, text: null },
  {
    nodeIdx: 1,
    label: "Open the book carefully",
    type: "safe",
    text: "Every choice branches your story. Go back to any point, pick a different path, and see where it leads.",
  },
  {
    nodeIdx: 3,
    label: "Follow the ink to its source",
    type: "emotional",
    text: "Your story grows into a tree of possibilities — each branch a different version only you can explore.",
  },
];

const TYPE_COLORS: Record<string, string> = {
  safe: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  emotional: "text-purple-400 bg-purple-500/10 border-purple-500/30",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroGraphSequence({ triggered, onComplete }: HeroGraphSequenceProps) {
  // -1 = tree building, 0/1/2 = cursor at each stop, 3 = done
  const [stop, setStop] = useState(-1);

  useEffect(() => {
    if (!triggered) return;
    setStop(-1);
    const timers = [
      setTimeout(() => setStop(0), 1200),
      setTimeout(() => setStop(1), 2400),
      setTimeout(() => setStop(2), 4200),
      setTimeout(() => setStop(3), 6000),
      setTimeout(() => onComplete?.(), 8500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [triggered, onComplete]);

  // Progressive active path highlighting
  const highlightedNodes = new Set<number>();
  const highlightedEdges = new Set<number>();
  if (stop >= 0) highlightedNodes.add(0);
  if (stop >= 1) { highlightedNodes.add(1); highlightedEdges.add(0); }
  if (stop >= 2) { highlightedNodes.add(3); highlightedEdges.add(2); }

  const cursorNode = stop >= 0 ? NODES[STOPS[Math.min(stop, 2)].nodeIdx] : null;
  const currentStop = stop >= 1 && stop <= 2 ? STOPS[stop] : null;

  if (!triggered) return null;

  return (
    <div className="absolute inset-0 rounded-2xl bg-card/60 backdrop-blur-sm p-6 md:p-8 overflow-hidden flex flex-col">
      {/* Editor chrome header — matches the typewriter panel */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="font-story text-sm font-medium text-foreground">The Pale Book</span>
        <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Story tree</span>
      </div>

      {/* Tree + bottom info */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        {/* Tree SVG */}
        <svg viewBox="0 0 300 210" className="w-full max-w-[360px] h-auto" aria-hidden="true">
          {/* Edges */}
          {EDGES.map((e, i) => {
            const from = NODES[e.from];
            const to = NODES[e.to];
            const lit = highlightedEdges.has(i);
            return (
              <line
                key={`e${i}`}
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke={lit ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)"}
                strokeWidth={lit ? 2 : 1}
                className="transition-all duration-700"
                style={{
                  opacity: 0,
                  animation: `fade-in 0.6s ${NODES[e.to].depth * 0.5 + 0.15}s cubic-bezier(0.16,1,0.3,1) forwards`,
                }}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((n, i) => {
            const lit = highlightedNodes.has(i);
            const isEnd = i === 3 && stop >= 2;
            const r = isEnd ? 7 : lit ? 5.5 : 4;

            return (
              <circle
                key={`n${i}`}
                cx={n.x} cy={n.y} r={r}
                fill={lit ? "hsl(var(--primary) / 0.6)" : "hsl(var(--muted-foreground) / 0.25)"}
                className="transition-all duration-700"
                style={{
                  opacity: 0,
                  animation: `fade-in 0.6s ${n.depth * 0.5}s cubic-bezier(0.16,1,0.3,1) forwards`,
                }}
              />
            );
          })}

          {/* Cursor ring */}
          {cursorNode && (
            <g
              style={{
                transform: `translate(${cursorNode.x}px, ${cursorNode.y}px)`,
                transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <circle cx={0} cy={0} r={13} fill="hsl(var(--primary) / 0.08)" />
              <circle cx={0} cy={0} r={13} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} opacity={0.5} />
              {/* Pulse */}
              <circle cx={0} cy={0} r={13} fill="none" stroke="hsl(var(--primary))" strokeWidth={1}>
                <animate attributeName="r" from="13" to="22" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.35" to="0" dur="1.8s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
        </svg>

        {/* Choice info / tagline */}
        <div className="w-full max-w-[360px] min-h-[60px]">
          {currentStop ? (
            <div key={stop} className="animate-fade-in">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${TYPE_COLORS[currentStop.type!]}`}>
                  {currentStop.type}
                </span>
                <span className="text-xs text-foreground/60">{currentStop.label}</span>
              </div>
              <p className="font-story text-xs text-foreground/40 leading-relaxed line-clamp-2">
                {currentStop.text}
              </p>
            </div>
          ) : stop >= 0 ? (
            <p className="text-sm text-muted-foreground text-center animate-fade-in">
              Every path is yours to explore
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

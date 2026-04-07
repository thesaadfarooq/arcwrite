import { useEffect, useRef, useState } from "react";
import { DemoGraph } from "@/components/demo/DemoGraph";
import { DEMO_TREES } from "@/lib/demo-stories";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "highlight" | "morph" | "graph" | "done";

export interface HeroGraphSequenceProps {
  triggered: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Safe path in hero tree: hero-1 → hero-2a (safe) → hero-3a (emotional)
// hero-3a is the endpoint of the path starting with the "safe" choice
const SELECTED_NODE_ID = "hero-3a";

// ─── Component ────────────────────────────────────────────────────────────────

export function HeroGraphSequence({ triggered }: HeroGraphSequenceProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  // Track whether the sequence has been started to prevent re-triggering
  const startedRef = useRef(false);

  useEffect(() => {
    if (!triggered || startedRef.current) return;

    // Mark as started so cleanup/re-runs don't restart the sequence
    startedRef.current = true;

    // Immediately enter highlight phase
    setPhase("highlight");

    const t1 = setTimeout(() => setPhase("morph"), 500);
    const t2 = setTimeout(() => setPhase("graph"), 1500);
    const t3 = setTimeout(() => setPhase("done"), 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [triggered]);

  if (phase === "idle") return null;

  if (phase === "highlight") {
    return (
      <div data-phase="highlight">
        <span className="inline-flex items-center rounded-full border border-primary/50 bg-primary/5 px-3 py-1 text-sm text-primary animate-pulse">
          Open the book carefully
        </span>
      </div>
    );
  }

  if (phase === "morph") {
    return (
      <div data-phase="morph" className="animate-morph-shrink">
        <span className="inline-flex items-center rounded-full border border-primary/50 bg-primary/5 px-3 py-1 text-sm text-primary">
          Open the book carefully
        </span>
      </div>
    );
  }

  // graph or done phase
  return (
    <div data-phase={phase}>
      <DemoGraph
        nodes={DEMO_TREES.hero.nodes}
        selectedNodeId={SELECTED_NODE_ID}
        onNodeSelect={() => {}}
        animated={true}
        className="w-full h-48"
      />
      {phase === "done" && (
        <p className="animate-fade-in text-sm text-muted-foreground mt-2">
          Your story, branching
        </p>
      )}
    </div>
  );
}

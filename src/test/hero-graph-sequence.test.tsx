import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { HeroGraphSequence } from "@/components/demo/HeroGraphSequence";
import { DEMO_TREES } from "@/lib/demo-stories";

describe("HeroGraphSequence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render anything when triggered=false", () => {
    const { container } = render(<HeroGraphSequence triggered={false} />);
    const phaseEl = container.querySelector("[data-phase]");
    expect(phaseEl).toBeNull();
  });

  it("shows highlight phase shortly after triggered=true", async () => {
    const { rerender } = render(<HeroGraphSequence triggered={false} />);
    await act(async () => {
      rerender(<HeroGraphSequence triggered={true} />);
    });
    // highlight is set synchronously on trigger — no timer advance needed
    // but advance a small amount to be safe (less than the 500ms morph timer)
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const phaseEl = document.querySelector("[data-phase='highlight']");
    expect(phaseEl).not.toBeNull();
  });

  it("transitions to graph phase after morph delay (~2100ms total)", async () => {
    const { rerender } = render(<HeroGraphSequence triggered={false} />);
    await act(async () => {
      rerender(<HeroGraphSequence triggered={true} />);
    });
    // Advance past highlight → morph (500ms)
    await act(async () => { vi.advanceTimersByTime(600); });
    // Advance past morph → graph (1500ms)
    await act(async () => { vi.advanceTimersByTime(1600); });

    const phaseEl = document.querySelector("[data-phase='graph']");
    expect(phaseEl).not.toBeNull();
  });

  it("shows 'Your story, branching' label in done phase (~6000ms total)", async () => {
    const { rerender } = render(<HeroGraphSequence triggered={false} />);
    await act(async () => {
      rerender(<HeroGraphSequence triggered={true} />);
    });
    await act(async () => { vi.advanceTimersByTime(600); });
    await act(async () => { vi.advanceTimersByTime(1600); });
    await act(async () => { vi.advanceTimersByTime(3500); });

    expect(screen.getByText(/your story, branching/i)).toBeInTheDocument();
  });

  it("renders graph nodes from hero demo data in done phase", async () => {
    const { rerender, container } = render(<HeroGraphSequence triggered={false} />);
    await act(async () => {
      rerender(<HeroGraphSequence triggered={true} />);
    });
    await act(async () => { vi.advanceTimersByTime(600); });
    await act(async () => { vi.advanceTimersByTime(1600); });
    await act(async () => { vi.advanceTimersByTime(3500); });

    const nodeCount = DEMO_TREES.hero.nodes.length;
    const renderedNodes = container.querySelectorAll("[data-node-id]");
    expect(renderedNodes.length).toBe(nodeCount);
  });
});

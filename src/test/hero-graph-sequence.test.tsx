import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { HeroGraphSequence } from "@/components/demo/HeroGraphSequence";

describe("HeroGraphSequence", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("does not render anything when triggered=false", () => {
    const { container } = render(<HeroGraphSequence triggered={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders SVG with nodes and edges when triggered=true", async () => {
    const { container } = render(<HeroGraphSequence triggered={true} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    // 7 nodes + cursor circles appear after timers
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(7);
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBe(6);
  });

  it("SVG is non-interactive (aria-hidden)", () => {
    const { container } = render(<HeroGraphSequence triggered={true} />);
    const svg = container.querySelector("svg[aria-hidden='true']");
    expect(svg).toBeTruthy();
  });

  it("shows choice label after cursor moves to first stop", async () => {
    render(<HeroGraphSequence triggered={true} />);
    // Advance past stop 1 (2400ms)
    await act(async () => { vi.advanceTimersByTime(2500); });
    expect(screen.getByText(/open the book carefully/i)).toBeInTheDocument();
    expect(screen.getByText(/safe/i)).toBeInTheDocument();
  });

  it("shows second choice and story text at stop 2", async () => {
    render(<HeroGraphSequence triggered={true} />);
    // Advance past stop 2 (4200ms)
    await act(async () => { vi.advanceTimersByTime(4300); });
    expect(screen.getByText(/follow the ink/i)).toBeInTheDocument();
    expect(screen.getByText(/emotional/i)).toBeInTheDocument();
  });

  it("shows tagline after all stops complete", async () => {
    render(<HeroGraphSequence triggered={true} />);
    // Advance past stop 3 (6000ms)
    await act(async () => { vi.advanceTimersByTime(6100); });
    expect(screen.getByText(/every path is yours/i)).toBeInTheDocument();
  });
});

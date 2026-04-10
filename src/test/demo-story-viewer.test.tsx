import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoStoryViewer } from "@/components/demo/DemoStoryViewer";
import { DEMO_TREES } from "@/lib/demo-stories";

const { nodes, title } = DEMO_TREES.fantasy;

describe("DemoStoryViewer", () => {
  it("renders the story title in the editor panel", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("shows root node text by default", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    expect(screen.getByText(/dragon's oath/i)).toBeInTheDocument();
  });

  it("shows choice cards for root node children", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    expect(screen.getByText("Climb toward the glow")).toBeInTheDocument();
    expect(screen.getByText("Wake the village elder")).toBeInTheDocument();
  });

  it("navigates to child node when choice is clicked", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    fireEvent.click(screen.getByText("Climb toward the glow"));
    expect(screen.getByText(/carved oath caught the light/i)).toBeInTheDocument();
  });

  it("renders the tree graph alongside the editor", () => {
    const { container } = render(<DemoStoryViewer nodes={nodes} title={title} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("shows panel descriptions", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    expect(screen.getByText(/choose what happens next/i)).toBeInTheDocument();
    expect(screen.getByText(/click any node to revert/i)).toBeInTheDocument();
  });

  it("tree selection syncs with editor", () => {
    const { container } = render(<DemoStoryViewer nodes={nodes} title={title} />);
    // Click a node in the tree (fan-2a)
    const nodeGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.click(nodeGroup);
    // Editor should now show that node's text
    expect(screen.getByText(/carved oath caught the light/i)).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoStoryViewer } from "@/components/demo/DemoStoryViewer";
import { DEMO_TREES } from "@/lib/demo-stories";

// fantasy tree structure:
//   fan-1 (root, startsChapter: true)
//     text: "...dragon's oath...mountain was glowing."
//   ├── fan-2a (parentId: fan-1, chosenLabel: "Climb toward the glow", chosenType: "risky")
//   │     text: "...carved oath caught the light..."
//   └── fan-2b (parentId: fan-1, chosenLabel: "Wake the village elder", chosenType: "safe")

const { nodes, title } = DEMO_TREES.fantasy;

describe("DemoStoryViewer", () => {
  it("renders the story title", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("renders the DemoGraph (svg element present)", () => {
    const { container } = render(<DemoStoryViewer nodes={nodes} title={title} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("shows root node text by default", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    // Root node fan-1 text contains "dragon's oath"
    expect(screen.getByText(/dragon's oath/i)).toBeInTheDocument();
  });

  it("updates reading panel when a non-root node is clicked", () => {
    const { container } = render(<DemoStoryViewer nodes={nodes} title={title} />);

    // Click node fan-2a whose text contains "carved oath caught the light"
    const nodeGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.click(nodeGroup);

    expect(screen.getByText(/carved oath caught the light/i)).toBeInTheDocument();
  });

  it("shows choice label and type for non-root nodes", () => {
    const { container } = render(<DemoStoryViewer nodes={nodes} title={title} />);

    // Click fan-2a: chosenLabel "Climb toward the glow", chosenType "risky"
    const nodeGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.click(nodeGroup);

    expect(screen.getByText("Climb toward the glow")).toBeInTheDocument();
    expect(screen.getByText(/risky/i)).toBeInTheDocument();
  });

  it("does not show choice info for the root node", () => {
    render(<DemoStoryViewer nodes={nodes} title={title} />);
    // Root node has no choice info — "Choice made:" should not appear
    expect(screen.queryByText(/choice made/i)).toBeNull();
  });
});

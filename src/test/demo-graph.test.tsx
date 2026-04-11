import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DemoGraph } from "@/components/demo/DemoGraph";
import { DEMO_TREES } from "@/lib/demo-stories";

// fantasy tree structure:
//   fan-1 (root)
//   ├── fan-2a (parentId: fan-1)
//   │   ├── fan-3a (parentId: fan-2a)
//   │   └── fan-3b (parentId: fan-2a)
//   └── fan-2b (parentId: fan-1)
//       └── fan-3c (parentId: fan-2b)
// Total: 6 nodes, 5 edges (all non-root nodes have a parent)

const nodes = DEMO_TREES.fantasy.nodes;

describe("DemoGraph", () => {
  it("renders an SVG with a circle group for each node", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    const nodeGroups = container.querySelectorAll("g[data-node-id]");
    expect(nodeGroups.length).toBe(nodes.length); // 6 nodes
  });

  it("renders one edge line per non-root node", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    // 5 nodes have parents → 5 edges
    const edges = container.querySelectorAll("line.demo-edge");
    expect(edges.length).toBe(nodes.filter((n) => n.parentId !== null).length);
  });

  it("gives the selected node g the .selected class", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-2a"
        onNodeSelect={vi.fn()}
      />,
    );

    const selected = container.querySelector('g[data-node-id="fan-2a"]');
    expect(selected).toBeTruthy();
    expect(selected!.classList.contains("selected")).toBe(true);
  });

  it("gives exactly one node the .selected class", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-3a"
        onNodeSelect={vi.fn()}
      />,
    );

    const selectedGroups = container.querySelectorAll("g.selected");
    expect(selectedGroups.length).toBe(1);
  });

  it("marks all nodes on the active path with .on-active-path", () => {
    // Selecting fan-3a: active path = fan-1 → fan-2a → fan-3a (3 nodes)
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-3a"
        onNodeSelect={vi.fn()}
      />,
    );

    const onActivePath = container.querySelectorAll("g.on-active-path");
    expect(onActivePath.length).toBe(3);

    const ids = Array.from(onActivePath).map((g) => g.getAttribute("data-node-id"));
    expect(ids).toContain("fan-1");
    expect(ids).toContain("fan-2a");
    expect(ids).toContain("fan-3a");
  });

  it("marks only the root when it is selected as .on-active-path", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    const onActivePath = container.querySelectorAll("g.on-active-path");
    expect(onActivePath.length).toBe(1);
    expect(onActivePath[0].getAttribute("data-node-id")).toBe("fan-1");
  });

  it("calls onNodeSelect with the node id when a node is clicked", () => {
    const onNodeSelect = vi.fn();

    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={onNodeSelect}
      />,
    );

    const targetGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.click(targetGroup);

    expect(onNodeSelect).toHaveBeenCalledTimes(1);
    expect(onNodeSelect).toHaveBeenCalledWith("fan-2a");
  });

  it("shows a tooltip with chosenLabel on mouseEnter", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    const targetGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.mouseEnter(targetGroup);

    // chosenLabel for fan-2a is "Climb toward the glow"
    expect(screen.getByText("Climb toward the glow")).toBeInTheDocument();
  });

  it("shows 'Story opening' in tooltip for the root node", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    const rootGroup = container.querySelector('g[data-node-id="fan-1"]')!;
    fireEvent.mouseEnter(rootGroup);

    expect(screen.getByText("Story opening")).toBeInTheDocument();
  });

  it("hides the tooltip after mouseLeave", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    const targetGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.mouseEnter(targetGroup);
    expect(screen.getByText("Climb toward the glow")).toBeInTheDocument();

    fireEvent.mouseLeave(targetGroup);
    expect(screen.queryByText("Climb toward the glow")).not.toBeInTheDocument();
  });

  it("shows chosenType in tooltip in uppercase", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    // fan-2a has chosenType: "risky"
    const targetGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.mouseEnter(targetGroup);

    expect(screen.getByText("RISKY")).toBeInTheDocument();
  });

  it("shows word count in tooltip", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    // fan-2a has wordCount: 39
    const targetGroup = container.querySelector('g[data-node-id="fan-2a"]')!;
    fireEvent.mouseEnter(targetGroup);

    expect(screen.getByText(/39w/)).toBeInTheDocument();
  });

  it("renders an SVG element at the top level", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
      />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("accepts an optional className on the wrapper", () => {
    const { container } = render(
      <DemoGraph
        nodes={nodes}
        selectedNodeId="fan-1"
        onNodeSelect={vi.fn()}
        className="my-test-class"
      />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("my-test-class")).toBe(true);
  });
});

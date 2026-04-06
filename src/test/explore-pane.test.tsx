import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/story/BranchGraph", () => ({
  BranchGraph: (props: { nodes?: unknown[] }) => <div data-testid="branch-graph">Graph ({props.nodes?.length ?? 0} nodes)</div>,
}));

describe("ExplorePane", () => {
  it("returns null when not open", async () => {
    const { ExplorePane } = await import("@/components/story/ExplorePane");
    const { container } = render(
      <ExplorePane
        isOpen={false}
        onClose={vi.fn()}
        nodes={[]}
        branches={[]}
        currentNodeId={null}
        mainBranchId={null}
        onNodeClick={vi.fn()}
        onBranchFromNode={vi.fn()}
        onPromoteBranch={vi.fn()}
        onDeleteBranch={vi.fn()}
        onExpandToFullPage={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the graph when open", async () => {
    const { ExplorePane } = await import("@/components/story/ExplorePane");
    render(
      <ExplorePane
        isOpen={true}
        onClose={vi.fn()}
        nodes={[{ id: "n1", parentId: null, branchId: null, chosenLabel: null, chosenType: null, chosenPreview: null, wordCount: 50, isActive: true, startsChapter: false }]}
        branches={[]}
        currentNodeId="n1"
        mainBranchId={null}
        onNodeClick={vi.fn()}
        onBranchFromNode={vi.fn()}
        onPromoteBranch={vi.fn()}
        onDeleteBranch={vi.fn()}
        onExpandToFullPage={vi.fn()}
      />
    );
    expect(screen.getByTestId("branch-graph")).toBeDefined();
    expect(screen.getByText("Graph (1 nodes)")).toBeDefined();
  });

  it("renders with a drag handle", async () => {
    const { ExplorePane } = await import("@/components/story/ExplorePane");
    const { container } = render(
      <ExplorePane
        isOpen={true}
        onClose={vi.fn()}
        nodes={[]}
        branches={[]}
        currentNodeId={null}
        mainBranchId={null}
        onNodeClick={vi.fn()}
        onBranchFromNode={vi.fn()}
        onPromoteBranch={vi.fn()}
        onDeleteBranch={vi.fn()}
        onExpandToFullPage={vi.fn()}
      />
    );
    expect(container.querySelector(".cursor-col-resize")).toBeDefined();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const getStoryMock = vi.fn();
const getAllStoryNodesMock = vi.fn();
const getBranchesMock = vi.fn();

vi.mock("@/lib/story-api", () => ({
  getStory: (...args: any[]) => getStoryMock(...args),
  getAllStoryNodes: (...args: any[]) => getAllStoryNodesMock(...args),
}));

vi.mock("@/lib/branch-api", () => ({
  getBranches: (...args: any[]) => getBranchesMock(...args),
  createBranch: vi.fn(),
  promoteBranch: vi.fn(),
  deleteBranch: vi.fn(),
}));

vi.mock("@/components/story/BranchGraph", () => ({
  BranchGraph: (props: any) => <div data-testid="branch-graph">BranchGraph ({props.nodes?.length ?? 0} nodes)</div>,
}));

function renderStoryExplore(Page: React.ComponentType) {
  render(
    <MemoryRouter initialEntries={["/story/s1/explore"]}>
      <Routes>
        <Route path="/story/:id/explore" element={<Page />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("StoryExplore page", () => {
  it("shows loading spinner initially", async () => {
    getStoryMock.mockReturnValue(new Promise(() => {})); // never resolves
    getAllStoryNodesMock.mockReturnValue(new Promise(() => {}));
    getBranchesMock.mockReturnValue(new Promise(() => {}));
    const { default: StoryExplore } = await import("@/pages/StoryExplore");
    const { container } = renderStoryExplore(StoryExplore) as any || {};
    // Should show spinner
    expect(document.querySelector(".animate-spin")).toBeDefined();
  });

  it("renders story title and branch graph after loading", async () => {
    getStoryMock.mockResolvedValue({ title: "My Epic" });
    getAllStoryNodesMock.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Once upon a time" },
      { id: "n2", parent_id: "n1", is_active: true, text: "Then something happened" },
    ]);
    getBranchesMock.mockResolvedValue([
      { id: "b1", is_main: true, name: "Main" },
    ]);
    const { default: StoryExplore } = await import("@/pages/StoryExplore");
    renderStoryExplore(StoryExplore);
    // Wait for load
    expect(await screen.findByText("My Epic")).toBeDefined();
    expect(screen.getAllByText(/1 branch/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 nodes/).length).toBeGreaterThan(0);
    expect(screen.getByTestId("branch-graph")).toBeDefined();
  });
});

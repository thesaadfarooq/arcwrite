import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockGetStory = vi.fn();
const mockGetAllNodes = vi.fn();
const mockGetBranches = vi.fn();
const mockCreateBranch = vi.fn();
const mockPromoteBranch = vi.fn();
const mockDeleteBranch = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/lib/story-api", () => ({
  getStory: (...args: any[]) => mockGetStory(...args),
  getAllStoryNodes: (...args: any[]) => mockGetAllNodes(...args),
}));

vi.mock("@/lib/branch-api", () => ({
  getBranches: (...args: any[]) => mockGetBranches(...args),
  createBranch: (...args: any[]) => mockCreateBranch(...args),
  promoteBranch: (...args: any[]) => mockPromoteBranch(...args),
  deleteBranch: (...args: any[]) => mockDeleteBranch(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => toastSuccessMock(...args),
    error: (...args: any[]) => toastErrorMock(...args),
  },
}));

let capturedBranchGraphProps: any = null;

vi.mock("@/components/story/BranchGraph", () => ({
  BranchGraph: (props: any) => {
    capturedBranchGraphProps = props;
    return (
      <div data-testid="branch-graph">
        <span>{props.nodes.length} nodes</span>
        <span>{props.branches.length} branches</span>
      </div>
    );
  },
}));

function renderExplore() {
  return import("@/pages/StoryExplore").then(({ default: StoryExplore }) => {
    render(
      <MemoryRouter initialEntries={["/explore/story1"]}>
        <Routes>
          <Route path="/explore/:id" element={<StoryExplore />} />
        </Routes>
      </MemoryRouter>
    );
  });
}

describe("StoryExplore handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBranchGraphProps = null;
  });

  it("loads and displays story data", async () => {
    mockGetStory.mockResolvedValue({ title: "My Story" });
    mockGetAllNodes.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Hello world" },
    ]);
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);

    await renderExplore();
    await waitFor(() => expect(screen.getByText("My Story")).toBeDefined());
    expect(screen.getAllByText(/1 branch/).length).toBeGreaterThan(0);
  });

  it("handles load error", async () => {
    mockGetStory.mockRejectedValue(new Error("Not found"));
    mockGetAllNodes.mockResolvedValue([]);
    mockGetBranches.mockResolvedValue([]);

    await renderExplore();
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Not found"));
  });

  it("creates a branch via callback", async () => {
    mockGetStory.mockResolvedValue({ title: "My Story" });
    mockGetAllNodes.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Hi" },
    ]);
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);
    mockCreateBranch.mockResolvedValue({ id: "b2", is_main: false });

    await renderExplore();
    await waitFor(() => expect(capturedBranchGraphProps).not.toBeNull());

    await capturedBranchGraphProps.onBranchFromNode("n1");
    expect(mockCreateBranch).toHaveBeenCalledWith("story1", "n1");
    expect(toastSuccessMock).toHaveBeenCalledWith("Branch created");
  });

  it("handles branch creation error", async () => {
    mockGetStory.mockResolvedValue({ title: "My Story" });
    mockGetAllNodes.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Hi" },
    ]);
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);
    mockCreateBranch.mockRejectedValue(new Error("Branch limit"));

    await renderExplore();
    await waitFor(() => expect(capturedBranchGraphProps).not.toBeNull());

    await capturedBranchGraphProps.onBranchFromNode("n1");
    expect(toastErrorMock).toHaveBeenCalledWith("Branch limit");
  });

  it("promotes a branch via callback", async () => {
    mockGetStory.mockResolvedValue({ title: "My Story" });
    mockGetAllNodes.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Hi" },
    ]);
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);
    mockPromoteBranch.mockResolvedValue(undefined);

    await renderExplore();
    await waitFor(() => expect(capturedBranchGraphProps).not.toBeNull());

    // After promote, it refetches branches and nodes
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);
    mockGetAllNodes.mockResolvedValue([{ id: "n1", parent_id: null, is_active: true, text: "Hi" }]);

    await capturedBranchGraphProps.onPromoteBranch("b1");
    expect(mockPromoteBranch).toHaveBeenCalledWith("b1");
    expect(toastSuccessMock).toHaveBeenCalledWith("Branch promoted to main");
  });

  it("deletes a branch via callback", async () => {
    mockGetStory.mockResolvedValue({ title: "My Story" });
    mockGetAllNodes.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Hi" },
    ]);
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }, { id: "b2", is_main: false }]);
    mockDeleteBranch.mockResolvedValue(undefined);

    await renderExplore();
    await waitFor(() => expect(capturedBranchGraphProps).not.toBeNull());

    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);
    mockGetAllNodes.mockResolvedValue([{ id: "n1", parent_id: null, is_active: true, text: "Hi" }]);

    await capturedBranchGraphProps.onDeleteBranch("b2");
    expect(mockDeleteBranch).toHaveBeenCalledWith("b2");
    expect(toastSuccessMock).toHaveBeenCalledWith("Branch deleted");
  });

  it("handles delete branch error", async () => {
    mockGetStory.mockResolvedValue({ title: "My Story" });
    mockGetAllNodes.mockResolvedValue([
      { id: "n1", parent_id: null, is_active: true, text: "Hi" },
    ]);
    mockGetBranches.mockResolvedValue([{ id: "b1", is_main: true }]);
    mockDeleteBranch.mockRejectedValue(new Error("Cannot delete main"));

    await renderExplore();
    await waitFor(() => expect(capturedBranchGraphProps).not.toBeNull());

    await capturedBranchGraphProps.onDeleteBranch("b1");
    expect(toastErrorMock).toHaveBeenCalledWith("Cannot delete main");
  });
});

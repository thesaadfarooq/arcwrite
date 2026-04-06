import { describe, expect, it, vi, beforeEach } from "vitest";

const getBranchesMock = vi.fn();
const createBranchMock = vi.fn();
const promoteBranchMock = vi.fn();
const renameBranchMock = vi.fn();
const deleteBranchMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getBranches: (...args: unknown[]) => getBranchesMock(...args),
    createBranch: (...args: unknown[]) => createBranchMock(...args),
    promoteBranch: (...args: unknown[]) => promoteBranchMock(...args),
    renameBranch: (...args: unknown[]) => renameBranchMock(...args),
    deleteBranch: (...args: unknown[]) => deleteBranchMock(...args),
  },
}));

describe("branch-api", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getBranches delegates to apiClient", async () => {
    getBranchesMock.mockResolvedValue([{ id: "b1" }]);
    const { getBranches } = await import("@/lib/branch-api");
    const result = await getBranches("s1");
    expect(getBranchesMock).toHaveBeenCalledWith("s1");
    expect(result).toEqual([{ id: "b1" }]);
  });

  it("createBranch delegates to apiClient", async () => {
    createBranchMock.mockResolvedValue({ id: "b2" });
    const { createBranch } = await import("@/lib/branch-api");
    const result = await createBranch("s1", "n1", "My Branch");
    expect(createBranchMock).toHaveBeenCalledWith({ story_id: "s1", fork_node_id: "n1", name: "My Branch" });
    expect(result).toEqual({ id: "b2" });
  });

  it("promoteBranch delegates to apiClient", async () => {
    promoteBranchMock.mockResolvedValue(undefined);
    const { promoteBranch } = await import("@/lib/branch-api");
    await promoteBranch("b1");
    expect(promoteBranchMock).toHaveBeenCalledWith("b1");
  });

  it("renameBranch delegates to apiClient", async () => {
    renameBranchMock.mockResolvedValue({ id: "b1", name: "New" });
    const { renameBranch } = await import("@/lib/branch-api");
    const result = await renameBranch("b1", "New");
    expect(renameBranchMock).toHaveBeenCalledWith("b1", "New");
    expect(result).toEqual({ id: "b1", name: "New" });
  });

  it("deleteBranch delegates to apiClient", async () => {
    deleteBranchMock.mockResolvedValue(undefined);
    const { deleteBranch } = await import("@/lib/branch-api");
    await deleteBranch("b1");
    expect(deleteBranchMock).toHaveBeenCalledWith("b1");
  });
});

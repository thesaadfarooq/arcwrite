import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BranchGraph, type GraphNode } from "@/components/story/BranchGraph";
import { type Branch, getBranches, createBranch, promoteBranch, deleteBranch } from "@/lib/branch-api";
import { getAllStoryNodes, getStory } from "@/lib/story-api";
import { toast } from "sonner";

export default function StoryExplore() {
  const { id: storyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allNodes, setAllNodes] = useState<any[]>([]);
  const [storyTitle, setStoryTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storyId) return;
    async function load() {
      try {
        const [story, nodes, branchList] = await Promise.all([
          getStory(storyId!),
          getAllStoryNodes(storyId!),
          getBranches(storyId!),
        ]);
        setStoryTitle(story.title);
        setAllNodes(nodes);
        setBranches(branchList);
      } catch (e: any) {
        toast.error(e.message || "Failed to load story");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [storyId]);

  const mainBranch = useMemo(() => branches.find((b) => b.is_main) ?? null, [branches]);

  const graphNodes: GraphNode[] = useMemo(() => {
    const childCount = new Map<string, number>();
    for (const n of allNodes) {
      if (n.parent_id) childCount.set(n.parent_id, (childCount.get(n.parent_id) ?? 0) + 1);
    }
    const isSplitNode = (n: typeof allNodes[number]) =>
      n.starts_chapter === true &&
      !n.chosen_option &&
      n.parent_id &&
      (childCount.get(n.parent_id) ?? 0) === 1;

    const splitIds = new Set(allNodes.filter(isSplitNode).map((n) => n.id));
    const parentRemap = new Map<string, string | null>();
    for (const n of allNodes) {
      if (splitIds.has(n.id)) parentRemap.set(n.id, n.parent_id);
    }
    const resolveParent = (parentId: string | null): string | null => {
      let cur = parentId;
      while (cur && parentRemap.has(cur)) cur = parentRemap.get(cur)!;
      return cur;
    };

    return allNodes
      .filter((n) => !splitIds.has(n.id))
      .map((n) => ({
        id: n.id,
        parentId: resolveParent(n.parent_id),
        branchId: n.branch_id ?? null,
        chosenLabel: (n.chosen_option as any)?.label ?? null,
        chosenType: (n.chosen_option as any)?.type ?? null,
        chosenPreview: (n.chosen_option as any)?.preview ?? null,
        wordCount: n.text?.split(/\s+/).filter(Boolean).length ?? 0,
        isActive: n.is_active,
        startsChapter: n.starts_chapter === true,
      }));
  }, [allNodes]);

  const currentNodeId = useMemo(() => {
    const active = allNodes.filter((n) => n.is_active);
    return active.length > 0 ? active[active.length - 1].id : null;
  }, [allNodes]);

  const handleNodeClick = useCallback(
    (_nodeId: string) => { navigate(`/story/${storyId}`); },
    [navigate, storyId]
  );

  const handleBranchFromNode = useCallback(async (nodeId: string) => {
    if (!storyId) return;
    try {
      const newBranch = await createBranch(storyId, nodeId);
      setBranches((prev) => [...prev, newBranch]);
      toast.success("Branch created");
    } catch (e: any) {
      toast.error(e.message || "Failed to create branch");
    }
  }, [storyId]);

  const handlePromoteBranch = useCallback(async (branchId: string) => {
    if (!storyId) return;
    try {
      await promoteBranch(branchId);
      const [updatedBranches, updatedNodes] = await Promise.all([
        getBranches(storyId),
        getAllStoryNodes(storyId),
      ]);
      setBranches(updatedBranches);
      setAllNodes(updatedNodes);
      toast.success("Branch promoted to main");
    } catch (e: any) {
      toast.error(e.message || "Failed to promote branch");
    }
  }, [storyId]);

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!storyId) return;
    try {
      await deleteBranch(branchId);
      const [updatedBranches, updatedNodes] = await Promise.all([
        getBranches(storyId),
        getAllStoryNodes(storyId),
      ]);
      setBranches(updatedBranches);
      setAllNodes(updatedNodes);
      toast.success("Branch deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete branch");
    }
  }, [storyId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(`/story/${storyId}`)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-medium text-foreground">{storyTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {branches.length} branch{branches.length !== 1 ? "es" : ""} · {allNodes.length} nodes
          </p>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <BranchGraph
          nodes={graphNodes}
          branches={branches}
          currentNodeId={currentNodeId}
          mainBranchId={mainBranch?.id ?? null}
          onNodeClick={handleNodeClick}
          onBranchFromNode={handleBranchFromNode}
          onPromoteBranch={handlePromoteBranch}
          onDeleteBranch={handleDeleteBranch}
        />
      </div>
    </div>
  );
}

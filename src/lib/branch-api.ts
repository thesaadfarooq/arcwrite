import { apiClient } from "@/lib/api-client";

export interface Branch {
  id: string;
  story_id: string;
  name: string | null;
  is_main: boolean;
  fork_node_id: string | null;
  tip_node_id: string | null;
  created_at: string;
}

export async function getBranches(storyId: string): Promise<Branch[]> {
  return apiClient.getBranches(storyId);
}

export async function createBranch(
  storyId: string,
  forkNodeId: string,
  name?: string
): Promise<Branch> {
  return apiClient.createBranch({ story_id: storyId, fork_node_id: forkNodeId, name });
}

export async function promoteBranch(branchId: string): Promise<void> {
  await apiClient.promoteBranch(branchId);
}

export async function renameBranch(branchId: string, name: string): Promise<Branch> {
  return apiClient.renameBranch(branchId, name);
}

export async function deleteBranch(branchId: string): Promise<void> {
  await apiClient.deleteBranch(branchId);
}

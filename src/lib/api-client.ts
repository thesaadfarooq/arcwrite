import type { Json } from "@/lib/types";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type StoryRow = {
  id: string;
  title: string;
  genre: string | null;
  tone: string | null;
  premise: string | null;
  status: string;
  target_turns: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
};

export type StoryNodeRow = {
  id: string;
  story_id: string;
  parent_id: string | null;
  text: string;
  summary: string | null;
  story_state: Json;
  choices: Json;
  chosen_option: Json;
  is_active: boolean;
  branch_id: string | null;
  starts_chapter: boolean;
  chapter_title: string | null;
  created_at: string;
};

type BranchRow = {
  id: string;
  story_id: string;
  fork_node_id: string;
  name: string | null;
  is_main: boolean;
  created_at: string;
};

type SplitNodeResponse = {
  success: boolean;
  newNodeId: string;
  parentId: string;
};

type SharedStoryResponse = {
  story: StoryRow;
  nodes: StoryNodeRow[];
};

type ChapterSuggestion = {
  nodeId: string;
  suggestedTitle: string;
  reason: string;
};

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  requireAuth?: boolean;
};

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (!_getToken) return null;
  return _getToken();
}

async function request<T>(
  path: string,
  { method = "GET", body, requireAuth = true }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};

  if (requireAuth) {
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let serializedBody: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(path, {
    method,
    headers,
    body: serializedBody,
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }

  return payload as T;
}

export const apiClient = {
  getProfile() {
    return request<{
      user_id: string;
      tier: string;
      tier_override: string | null;
    }>("/api/db/profile");
  },

  getStories() {
    return request<StoryRow[]>("/api/db/stories");
  },

  getStory(id: string) {
    return request<StoryRow>(`/api/db/stories?id=${id}`);
  },

  createStory(payload: Record<string, unknown>) {
    return request<StoryRow>("/api/db/stories", {
      method: "POST",
      body: payload,
    });
  },

  updateStory(id: string, payload: Record<string, unknown>) {
    return request<StoryRow>(`/api/db/stories?id=${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  deleteStory(id: string) {
    return request<{ success: boolean }>(`/api/db/stories?id=${id}`, {
      method: "DELETE",
    });
  },

  async getStoryCount() {
    const result = await request<{ count: number }>("/api/db/stories?count=true");
    return result.count;
  },

  getNodes(storyId: string, { active = true }: { active?: boolean } = {}) {
    const params = new URLSearchParams({ story_id: storyId });
    if (!active) {
      params.set("active", "all");
    }

    return request<StoryNodeRow[]>(`/api/db/nodes?${params.toString()}`);
  },

  createNode(payload: Record<string, unknown>) {
    return request<StoryNodeRow>("/api/db/nodes", {
      method: "POST",
      body: payload,
    });
  },

  updateNode(id: string, payload: Record<string, unknown>) {
    return request<StoryNodeRow>(`/api/db/nodes?id=${id}`, {
      method: "PATCH",
      body: payload,
    });
  },

  jumpToNode(id: string) {
    return request<{ success: boolean }>(`/api/db/nodes?id=${id}&action=jump`, {
      method: "POST",
    });
  },

  splitNode(id: string, position: number) {
    return request<SplitNodeResponse>(`/api/db/nodes?id=${id}&action=split`, {
      method: "POST",
      body: { position },
    });
  },

  mergeNode(id: string) {
    return request<{ success: boolean; parentId: string | null }>(`/api/db/nodes?id=${id}&action=merge`, {
      method: "POST",
    });
  },

  deleteNodeSubtree(id: string) {
    return request<{ success: boolean; parentId: string | null }>(`/api/db/nodes?id=${id}&action=subtree`, {
      method: "DELETE",
    });
  },

  getSharedStory(token: string) {
    return request<SharedStoryResponse>(`/api/db/shared/${token}`, {
      requireAuth: false,
    });
  },

  generateChapterSuggestions(payload: Record<string, unknown>) {
    return request<{ suggestions: ChapterSuggestion[] }>("/api/generate-chapter-suggestions", {
      method: "POST",
      body: payload,
    });
  },

  generateChapterTitle(payload: Record<string, unknown>) {
    return request<{ title: string }>("/api/generate-chapter-title", {
      method: "POST",
      body: payload,
    });
  },

  // Branch operations
  getBranches(storyId: string) {
    return request<BranchRow[]>(`/api/db/branches?story_id=${storyId}`);
  },

  createBranch(payload: { story_id: string; fork_node_id: string; name?: string }) {
    return request<BranchRow>("/api/db/branches?action=create", {
      method: "POST",
      body: payload,
    });
  },

  promoteBranch(branchId: string) {
    return request<{ success: boolean }>(`/api/db/branches?id=${branchId}&action=promote`, {
      method: "POST",
    });
  },

  renameBranch(branchId: string, name: string) {
    return request<BranchRow>(`/api/db/branches?id=${branchId}`, {
      method: "PATCH",
      body: { name },
    });
  },

  deleteBranch(branchId: string) {
    return request<{ success: boolean }>(`/api/db/branches?id=${branchId}`, {
      method: "DELETE",
    });
  },
};

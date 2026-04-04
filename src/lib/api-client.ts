import { supabase } from "@/integrations/supabase/client";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  requireAuth?: boolean;
};

async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
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
      display_name: string | null;
      avatar_url: string | null;
      tier: string;
      tier_override: string | null;
    }>("/api/db/profile");
  },

  getStories() {
    return request<any[]>("/api/db/stories");
  },

  getStory(id: string) {
    return request<any>(`/api/db/stories?id=${id}`);
  },

  createStory(payload: Record<string, unknown>) {
    return request<any>("/api/db/stories", {
      method: "POST",
      body: payload,
    });
  },

  updateStory(id: string, payload: Record<string, unknown>) {
    return request<any>(`/api/db/stories?id=${id}`, {
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

    return request<any[]>(`/api/db/nodes?${params.toString()}`);
  },

  createNode(payload: Record<string, unknown>) {
    return request<any>("/api/db/nodes", {
      method: "POST",
      body: payload,
    });
  },

  updateNode(id: string, payload: Record<string, unknown>) {
    return request<any>(`/api/db/nodes?id=${id}`, {
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
    return request<any>(`/api/db/nodes?id=${id}&action=split`, {
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
    return request<{ story: any; nodes: any[] }>(`/api/db/shared/${token}`, {
      requireAuth: false,
    });
  },

  generateChapterSuggestions(payload: Record<string, unknown>) {
    return request<{ suggestions: any[] }>("/api/generate-chapter-suggestions", {
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
    return request<any[]>(`/api/db/branches?story_id=${storyId}`);
  },

  createBranch(payload: { story_id: string; fork_node_id: string; name?: string }) {
    return request<any>("/api/db/branches?action=create", {
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
    return request<any>(`/api/db/branches?id=${branchId}`, {
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

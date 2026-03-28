import { supabase } from "@/integrations/supabase/client";
import type { StoryChoice } from "@/components/story/ChoiceCards";
import { apiClient } from "@/lib/api-client";

export type SectionLength = "short" | "medium" | "long" | "epic";
export type NarrativePhase = "setup" | "rising" | "climax" | "falling" | "resolution";
export type StoryBeat = {
  phase: NarrativePhase;
  progress: number;
  phaseProgress?: number;
  turnsRemaining?: number;
  isNearEnd?: boolean;
  isFinalSection?: boolean;
};

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

export async function streamSection({
  premise, genre, tone, direction, summary, recentText, storyState, length, beat, onDelta, onDone, onError,
}: {
  premise?: string; genre?: string; tone?: string; direction?: string;
  summary?: string; recentText?: string; storyState?: any; length?: SectionLength;
  beat?: StoryBeat;
  onDelta: (text: string) => void; onDone: (fullText: string) => void; onError: (error: string) => void;
}) {
  try {
    const accessToken = await getAccessToken();
    const resp = await fetch("/api/generate-section", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        premise,
        genre,
        tone,
        direction,
        summary,
        recentText,
        storyState,
        length: length || "medium",
        beat,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Generation failed" }));
      onError(err.error || "Generation failed");
      return;
    }

    if (!resp.body) { onError("No response body"); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    onDone(fullText);
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}

export async function generateChoices({
  recentText, summary, storyState, tone, genre, premise, beat,
}: {
  recentText: string; summary?: string; storyState?: any; tone?: string; genre?: string; premise?: string;
  beat?: StoryBeat;
}): Promise<StoryChoice[]> {
  const accessToken = await getAccessToken();
  const resp = await fetch("/api/generate-choices", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ recentText, summary, storyState, tone, genre, premise, beat }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Failed to generate choices" }));
    throw new Error(err.error || "Failed to generate choices");
  }

  const data = await resp.json();
  return data.choices || data;
}

export async function summarizeStory({
  fullText, previousSummary, storyState,
}: {
  fullText: string; previousSummary?: string; storyState?: any;
}): Promise<{ summary: string; story_state: any }> {
  const accessToken = await getAccessToken();
  const resp = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fullText, previousSummary, storyState }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Failed to summarize" }));
    throw new Error(err.error || "Failed to summarize");
  }

  return resp.json();
}

export async function createStory({
  title,
  genre,
  tone,
  premise,
  targetTurns,
  userId,
}: {
  title?: string;
  genre?: string;
  tone?: string;
  premise?: string;
  targetTurns?: number;
  userId: string;
}) {
  void userId;
  return apiClient.createStory({
    title: title || "Untitled Story",
    genre,
    tone,
    premise,
    status: "in_progress",
    target_turns: targetTurns ?? 35,
  });
}

export async function createStoryNode({
  storyId,
  parentId,
  text,
  summary,
  storyState,
  choices,
  chosenOption,
}: {
  storyId: string;
  parentId?: string;
  text: string;
  summary?: string;
  storyState?: any;
  choices?: StoryChoice[];
  chosenOption?: any;
}) {
  // A node starts a chapter only if it's the root (no parent)
  const isRoot = !parentId;
  const insertObj: Record<string, any> = {
    story_id: storyId,
    parent_id: parentId || null,
    text,
    summary: summary || null,
    story_state: storyState || {},
    choices: (choices || []) as any,
    chosen_option: chosenOption || null,
    starts_chapter: isRoot,
  };
  return apiClient.createNode(insertObj);
}

export async function getStoryNodes(storyId: string) {
  return apiClient.getNodes(storyId);
}

export async function getAllStoryNodes(storyId: string) {
  return apiClient.getNodes(storyId, { active: false });
}

export async function getStory(storyId: string) {
  return apiClient.getStory(storyId);
}

export async function updateStoryTitle(storyId: string, title: string) {
  await apiClient.updateStory(storyId, { title });
}

export async function updateStoryTone(storyId: string, tone: string) {
  await apiClient.updateStory(storyId, { tone });
}

export async function jumpToNode(storyId: string, nodeId: string) {
  void storyId;
  await apiClient.jumpToNode(nodeId);
}

export async function deactivateNodesAfter(storyId: string, nodeId: string) {
  return jumpToNode(storyId, nodeId);
}

export async function updateNodeChapterTitle(nodeId: string, title: string) {
  await apiClient.updateNode(nodeId, { chapter_title: title });
}

export async function deleteNodeAndDescendants(storyId: string, nodeId: string) {
  void storyId;
  const result = await apiClient.deleteNodeSubtree(nodeId);
  return result.parentId ?? null;
}

export async function splitNodeAtPosition(storyId: string, nodeId: string, splitIndex: number) {
  void storyId;
  return apiClient.splitNode(nodeId, splitIndex);
}

export async function mergeNodeWithParent(storyId: string, nodeId: string) {
  void storyId;
  const result = await apiClient.mergeNode(nodeId);
  return result.parentId ?? null;
}

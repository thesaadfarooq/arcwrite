import { supabase } from "@/integrations/supabase/client";
import type { StoryChoice } from "@/components/story/ChoiceCards";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export type SectionLength = "short" | "medium" | "long" | "epic";

export async function streamSection({
  premise,
  genre,
  tone,
  direction,
  summary,
  recentText,
  storyState,
  length,
  onDelta,
  onDone,
  onError,
}: {
  premise?: string;
  genre?: string;
  tone?: string;
  direction?: string;
  summary?: string;
  recentText?: string;
  storyState?: any;
  length?: SectionLength;
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(`${FUNCTIONS_URL}/generate-section`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ premise, genre, tone, direction, summary, recentText, storyState }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Generation failed" }));
      onError(err.error || "Generation failed");
      return;
    }

    if (!resp.body) {
      onError("No response body");
      return;
    }

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
  recentText,
  summary,
  storyState,
  tone,
  genre,
}: {
  recentText: string;
  summary?: string;
  storyState?: any;
  tone?: string;
  genre?: string;
}): Promise<StoryChoice[]> {
  const { data, error } = await supabase.functions.invoke("generate-choices", {
    body: { recentText, summary, storyState, tone, genre },
  });

  if (error) throw new Error(error.message || "Failed to generate choices");
  return data.choices || data;
}

export async function summarizeStory({
  fullText,
  previousSummary,
  storyState,
}: {
  fullText: string;
  previousSummary?: string;
  storyState?: any;
}): Promise<{ summary: string; story_state: any }> {
  const { data, error } = await supabase.functions.invoke("summarize", {
    body: { fullText, previousSummary, storyState },
  });

  if (error) throw new Error(error.message || "Failed to summarize");
  return data;
}

export async function createStory({
  title,
  genre,
  tone,
  premise,
  userId,
}: {
  title?: string;
  genre?: string;
  tone?: string;
  premise?: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: userId,
      title: title || "Untitled Story",
      genre,
      tone,
      premise,
      status: "in_progress",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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
  const { data, error } = await supabase
    .from("story_nodes")
    .insert(insertObj as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStoryNodes(storyId: string) {
  const { data, error } = await supabase
    .from("story_nodes")
    .select("*")
    .eq("story_id", storyId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAllStoryNodes(storyId: string) {
  const { data, error } = await supabase
    .from("story_nodes")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getStory(storyId: string) {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", storyId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStoryTitle(storyId: string, title: string) {
  const { error } = await supabase
    .from("stories")
    .update({ title })
    .eq("id", storyId);

  if (error) throw error;
}

export async function updateStoryTone(storyId: string, tone: string) {
  const { error } = await supabase
    .from("stories")
    .update({ tone })
    .eq("id", storyId);

  if (error) throw error;
}

export async function jumpToNode(storyId: string, nodeId: string) {
  // 1. Deactivate ALL nodes in this story
  const { error: deactErr } = await supabase
    .from("story_nodes")
    .update({ is_active: false } as any)
    .eq("story_id", storyId)
    .eq("is_active", true);

  if (deactErr) throw deactErr;

  // 2. Walk up from target node to root, collecting ancestor IDs
  const { data: allNodes, error: fetchErr } = await supabase
    .from("story_nodes")
    .select("id, parent_id")
    .eq("story_id", storyId);

  if (fetchErr) throw fetchErr;

  const nodeMap = new Map(allNodes.map((n: any) => [n.id, n.parent_id]));
  const pathIds: string[] = [];
  let current: string | null = nodeId;
  while (current) {
    pathIds.push(current);
    current = nodeMap.get(current) || null;
  }

  // 3. Re-activate only the path nodes
  if (pathIds.length > 0) {
    const { error: actErr } = await supabase
      .from("story_nodes")
      .update({ is_active: true } as any)
      .eq("story_id", storyId)
      .in("id", pathIds);

    if (actErr) throw actErr;
  }
}

export async function deactivateNodesAfter(storyId: string, nodeId: string) {
  return jumpToNode(storyId, nodeId);
}

export async function updateNodeChapterTitle(nodeId: string, title: string) {
  const { error } = await supabase
    .from("story_nodes")
    .update({ chapter_title: title } as any)
    .eq("id", nodeId);

  if (error) throw error;
}

export async function deleteNodeAndDescendants(storyId: string, nodeId: string) {
  // Get all nodes to find descendants
  const { data: allNodes, error: fetchErr } = await supabase
    .from("story_nodes")
    .select("id, parent_id")
    .eq("story_id", storyId);

  if (fetchErr) throw fetchErr;

  // Find the node's parent
  const targetNode = allNodes.find((n: any) => n.id === nodeId);
  if (!targetNode) throw new Error("Node not found");

  // Collect node and all descendants via BFS
  const toDelete = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    toDelete.add(current);
    allNodes
      .filter((n: any) => n.parent_id === current)
      .forEach((n: any) => queue.push(n.id));
  }

  // Delete all collected nodes
  const { error: delErr } = await supabase
    .from("story_nodes")
    .delete()
    .eq("story_id", storyId)
    .in("id", Array.from(toDelete));

  if (delErr) throw delErr;

  // If there's a parent, jump to it to fix active path
  if (targetNode.parent_id) {
    await jumpToNode(storyId, targetNode.parent_id);
  }

  return targetNode.parent_id;
}

export async function splitNodeAtPosition(storyId: string, nodeId: string, splitIndex: number) {
  // Get the node
  const { data: node, error: fetchErr } = await supabase
    .from("story_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();

  if (fetchErr) throw fetchErr;

  const paragraphs = (node.text || "").split("\n\n").filter(Boolean);
  if (splitIndex <= 0 || splitIndex >= paragraphs.length) {
    throw new Error("Invalid split position");
  }

  const textBefore = paragraphs.slice(0, splitIndex).join("\n\n");
  const textAfter = paragraphs.slice(splitIndex).join("\n\n");

  // Update the original node with text before split
  const { error: updateErr } = await supabase
    .from("story_nodes")
    .update({ text: textBefore } as any)
    .eq("id", nodeId);

  if (updateErr) throw updateErr;

  // Re-parent existing children of this node to the new child
  // First create the new child node
  const { data: newNode, error: insertErr } = await supabase
    .from("story_nodes")
    .insert({
      story_id: storyId,
      parent_id: nodeId,
      text: textAfter,
      summary: node.summary,
      story_state: node.story_state,
      choices: node.choices,
      chosen_option: null,
      is_active: node.is_active,
      starts_chapter: true,
    } as any)
    .select()
    .single();

  if (insertErr) throw insertErr;

  // Re-parent old children to the new node
  const { data: children } = await supabase
    .from("story_nodes")
    .select("id")
    .eq("parent_id", nodeId)
    .neq("id", newNode.id);

  if (children && children.length > 0) {
    const { error: reparentErr } = await supabase
      .from("story_nodes")
      .update({ parent_id: newNode.id } as any)
      .in("id", children.map((c: any) => c.id));

    if (reparentErr) throw reparentErr;
  }

  // Clear choices from original node (they belong to the end)
  await supabase
    .from("story_nodes")
    .update({ choices: [] as any, summary: null } as any)
    .eq("id", nodeId);

  return newNode;
}

export async function mergeNodeWithParent(storyId: string, nodeId: string) {
  const { data: node, error: fetchErr } = await supabase
    .from("story_nodes")
    .select("*")
    .eq("id", nodeId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!node.parent_id) throw new Error("Cannot merge the root node");

  // Get parent
  const { data: parent, error: parentErr } = await supabase
    .from("story_nodes")
    .select("*")
    .eq("id", node.parent_id)
    .single();

  if (parentErr) throw parentErr;

  // Merge text
  const mergedText = [parent.text, node.text].filter(Boolean).join("\n\n");

  // Update parent with merged text and child's metadata
  const { error: updateErr } = await supabase
    .from("story_nodes")
    .update({
      text: mergedText,
      summary: node.summary || parent.summary,
      story_state: node.story_state || parent.story_state,
      choices: node.choices,
    } as any)
    .eq("id", node.parent_id);

  if (updateErr) throw updateErr;

  // Re-parent child's children to parent
  const { data: grandchildren } = await supabase
    .from("story_nodes")
    .select("id")
    .eq("parent_id", nodeId);

  if (grandchildren && grandchildren.length > 0) {
    const { error: reparentErr } = await supabase
      .from("story_nodes")
      .update({ parent_id: node.parent_id } as any)
      .in("id", grandchildren.map((c: any) => c.id));

    if (reparentErr) throw reparentErr;
  }

  // Delete the merged node
  const { error: delErr } = await supabase
    .from("story_nodes")
    .delete()
    .eq("id", nodeId);

  if (delErr) throw delErr;

  return node.parent_id;
}

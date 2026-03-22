import { supabase } from "@/integrations/supabase/client";
import type { StoryChoice } from "@/components/story/ChoiceCards";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function streamSection({
  premise,
  genre,
  tone,
  direction,
  summary,
  recentText,
  storyState,
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
  const { data, error } = await supabase
    .from("story_nodes")
    .insert({
      story_id: storyId,
      parent_id: parentId || null,
      text,
      summary: summary || null,
      story_state: storyState || {},
      choices: choices || [],
      chosen_option: chosenOption || null,
    })
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

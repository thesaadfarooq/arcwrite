import { supabase } from "@/integrations/supabase/client";

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

export async function streamRewrite({
  paragraphText,
  instruction,
  tone,
  genre,
  premise,
  surroundingContext,
  onDelta,
  onDone,
  onError,
}: {
  paragraphText: string;
  instruction: string;
  tone?: string;
  genre?: string;
  premise?: string;
  surroundingContext: { before: string; after: string };
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}) {
  try {
    const accessToken = await getAccessToken();
    const resp = await fetch("/api/rewrite-paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ paragraphText, instruction, tone, genre, premise, surroundingContext }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Rewrite failed" }));
      onError(err.error || "Rewrite failed");
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

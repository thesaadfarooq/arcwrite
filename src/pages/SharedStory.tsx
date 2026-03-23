import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SharedStory() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadSharedStory();
  }, [token]);

  const loadSharedStory = async () => {
    try {
      const { data: storyData, error: storyErr } = await supabase
        .from("stories")
        .select("*")
        .eq("share_token", token)
        .single();

      if (storyErr || !storyData) {
        setError("Story not found or link has expired");
        setLoading(false);
        return;
      }

      setStory(storyData);

      const { data: nodesData } = await supabase
        .from("story_nodes")
        .select("text, chosen_option")
        .eq("story_id", storyData.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      setNodes(nodesData || []);
    } catch {
      setError("Failed to load story");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Go home
        </Button>
      </div>
    );
  }

  const wordCount = nodes.reduce((acc, n) => acc + (n.text || "").split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
      </nav>

      <main className="max-w-[680px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <div className="mb-10 text-center">
          {story.genre && (
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{story.genre}</span>
          )}
          <h1 className="font-story text-2xl md:text-3xl font-semibold text-foreground mt-1 leading-tight text-balance">
            {story.title}
          </h1>
        </div>

        <article className="font-story text-base leading-[1.85] text-foreground space-y-6">
          {nodes.map((node, i) => {
            const paragraphs = (node.text || "").split("\n\n").filter(Boolean);
            return (
              <section key={i}>
                {paragraphs.map((p: string, j: number) => (
                  <p key={j} className="mb-4 text-pretty">{p}</p>
                ))}
              </section>
            );
          })}
        </article>

        <div className="text-center mt-16 pt-8 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Created with{" "}
            <a href="/" className="text-primary hover:underline">Arcwrite</a>
          </p>
        </div>
      </main>
    </div>
  );
}

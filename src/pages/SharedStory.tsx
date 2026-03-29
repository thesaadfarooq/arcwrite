import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getGuestOrAuthedHref, getSharedStorySecondaryCta } from "@/lib/story-starters";
import { apiClient } from "@/lib/api-client";

type SharedStoryData = {
  id: string;
  title: string;
  genre: string | null;
};

type SharedStoryNode = {
  text: string | null;
  chosen_option: { label?: string } | null;
};

export default function SharedStory() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [story, setStory] = useState<SharedStoryData | null>(null);
  const [nodes, setNodes] = useState<SharedStoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const secondaryCta = getSharedStorySecondaryCta(story?.genre);
  const createStoryHref = getGuestOrAuthedHref("/story/new", !!user);

  const loadSharedStory = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiClient.getSharedStory(token);
      if (!data.story) {
        setError("Story not found or link has expired");
        return;
      }

      setStory(data.story as SharedStoryData);
      setNodes((data.nodes as SharedStoryNode[]) || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setError(
        message.toLowerCase().includes("not found")
          ? "Story not found or link has expired"
          : "Failed to load story"
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSharedStory();
  }, [loadSharedStory]);

  const handleCreateOwnStory = () => {
    navigate(createStoryHref);
  };

  const handleSecondaryAction = () => {
    navigate(secondaryCta.href);
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="max-w-xl w-full text-center space-y-6">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">This story is unavailable</p>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button onClick={handleCreateOwnStory}>
              Create your own story <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = nodes.reduce((acc, n) => acc + (n.text || "").split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="max-w-[680px] mx-auto px-6 md:px-12 pt-28 pb-16">
        <div className="flex justify-end mb-4">
          <span className="text-xs text-muted-foreground tabular-nums">{wordCount.toLocaleString()} words</span>
        </div>
        <div className="mb-10 text-center">
          {story?.genre && (
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{story.genre}</span>
          )}
          <h1 className="font-story text-2xl md:text-3xl font-semibold text-foreground mt-1 leading-tight text-balance">
            {story?.title ?? ""}
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

        <section className="mt-16 pt-10 border-t border-border/50">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Keep writing
            </div>
            <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mt-4 text-balance">
              Want to make a story of your own?
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Start from scratch or jump straight into a new prompt. You keep the momentum, Arcwrite handles the first draft.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <Button size="lg" onClick={handleCreateOwnStory}>
                Create your own story <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleSecondaryAction}>
                {secondaryCta.label}
              </Button>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

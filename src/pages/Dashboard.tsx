import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Plus, Sun, Moon, LogOut, LayoutGrid, List, Crown,
} from "lucide-react";
import { toast } from "sonner";
import { StoryGridCard, StoryListCard } from "@/components/dashboard/EditableStoryCard";

interface Story {
  id: string;
  title: string;
  genre: string | null;
  tone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  premise: string | null;
}

export default function Dashboard() {
  const { user, profile, tier, subscriptionEnd, cancelAtPeriodEnd, signOut, refreshSubscription } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchStories();
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Subscription activated! Refreshing your plan…");
      refreshSubscription();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Failed to load stories");
    } else {
      setStories(data || []);
    }
    setLoading(false);
  };

  const deleteStory = async (id: string) => {
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete story");
    } else {
      setStories((prev) => prev.filter((s) => s.id !== id));
      toast.success("Story deleted");
    }
  };

  const duplicateStory = async (story: Story) => {
    const { data, error } = await supabase
      .from("stories")
      .insert({
        user_id: user!.id,
        title: `${story.title} (copy)`,
        genre: story.genre,
        tone: story.tone,
        premise: story.premise,
        status: "draft",
      })
      .select()
      .single();
    if (error) {
      toast.error("Failed to duplicate story");
    } else {
      setStories((prev) => [data, ...prev]);
      toast.success("Story duplicated");
    }
  };

  const renameStory = async (id: string, newTitle: string) => {
    const { error } = await supabase.from("stories").update({ title: newTitle }).eq("id", id);
    if (error) {
      toast.error("Failed to rename story");
    } else {
      setStories((prev) => prev.map((s) => s.id === id ? { ...s, title: newTitle } : s));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "text-choice-safe";
      case "complete": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress": return "In Progress";
      case "complete": return "Complete";
      default: return "Draft";
    }
  };

  const cardProps = { onDelete: deleteStory, onDuplicate: duplicateStory, onRename: renameStory, getStatusColor, getStatusLabel };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {/* Header */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
            {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")} className="text-muted-foreground">
            <Crown className="w-4 h-4 mr-1" /> Upgrade
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-6 h-6 rounded-full" alt="" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {(profile?.display_name || user?.email || "U")[0].toUpperCase()}
              </div>
            )}
            <span className="hidden sm:inline">{profile?.display_name || user?.email}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {cancelAtPeriodEnd && (
          <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/[0.04]">
            <p className="text-sm text-foreground">
              Your <span className="font-medium">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span> plan has been cancelled.{" "}
              {subscriptionEnd
                ? <>You'll have access until <span className="font-medium">{new Date(subscriptionEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>.</>
                : <>You'll have access until the end of your billing period.</>
              }
            </p>
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-story text-2xl font-semibold text-foreground">Your Stories</h1>
            <p className="text-sm text-muted-foreground mt-1">{stories.length} {stories.length === 1 ? "story" : "stories"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg p-0.5">
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-secondary" : ""}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView("list")} className={`p-1.5 rounded-md transition-colors ${view === "list" ? "bg-secondary" : ""}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button onClick={() => navigate("/story/new")}>
              <Plus className="w-4 h-4 mr-1" /> New Story
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse-gentle" />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-story text-xl text-foreground mb-2">No stories yet</h2>
            <p className="text-muted-foreground mb-6">Start your first story and let AI bring it to life.</p>
            <Button onClick={() => navigate("/story/new")}>
              <Plus className="w-4 h-4 mr-1" /> Create your first story
            </Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((story, i) => (
              <StoryGridCard key={story.id} story={story} index={i} {...cardProps} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {stories.map((story, i) => (
              <StoryListCard key={story.id} story={story} index={i} {...cardProps} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

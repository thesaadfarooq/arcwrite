import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, BookOpen, Skull, Heart, Wand2, Search, Rocket, Ghost, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { createStory } from "@/lib/story-api";
import { getTierLimits } from "@/lib/subscription";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const genres = [
  { id: "fantasy", label: "Fantasy", icon: Wand2, desc: "Magic, mythical worlds, epic quests" },
  { id: "scifi", label: "Sci-Fi", icon: Rocket, desc: "Future tech, space, alien encounters" },
  { id: "mystery", label: "Mystery", icon: Search, desc: "Puzzles, detectives, hidden truths" },
  { id: "romance", label: "Romance", icon: Heart, desc: "Love, passion, human connection" },
  { id: "horror", label: "Horror", icon: Ghost, desc: "Fear, suspense, the unknown" },
  { id: "thriller", label: "Thriller", icon: Skull, desc: "Danger, high stakes, twists" },
];

const tones = [
  "Dark & gritty",
  "Whimsical & light",
  "Literary & introspective",
  "Fast-paced & cinematic",
  "Poetic & dreamlike",
  "Humorous & witty",
];

export default function StoryNew() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "scratch";
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, tier } = useAuth();

  const [step, setStep] = useState(mode === "genre" ? "genre" : mode === "surprise" ? "surprise" : "premise");
  const [premise, setPremise] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleStart = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const story = await createStory({
        userId: user.id,
        title: premise ? premise.slice(0, 60) : selectedGenre ? `${selectedGenre} story` : "Untitled Story",
        genre: selectedGenre || undefined,
        tone: selectedTone || undefined,
        premise: premise || (mode === "surprise" ? "Surprise me with something unexpected" : undefined),
      });
      navigate(`/story/${story.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create story");
      setCreating(false);
    }
  };

  const canProceed =
    step === "premise" ? premise.trim().length > 10 :
    step === "genre" ? !!selectedGenre :
    step === "surprise" ? true :
    step === "tone" ? !!selectedTone : false;

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">VibeWrite</span>
        </button>
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        </button>
      </nav>

      <main className="pt-24 pb-16 px-6 max-w-2xl mx-auto">
        {step === "premise" && (
          <div className="animate-fade-up">
            <h1 className="font-story text-3xl font-semibold text-foreground mb-2 text-balance">What's your story about?</h1>
            <p className="text-muted-foreground mb-8">Describe your idea in a few sentences. The more detail, the richer the opening.</p>
            <Textarea
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder="A retired astronaut discovers a signal from a star system she visited decades ago — but the civilization there was supposed to be extinct..."
              className="min-h-[160px] font-story text-base leading-relaxed resize-none bg-card"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep("tone")} disabled={!canProceed}>
                Choose tone <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "genre" && (
          <div className="animate-fade-up">
            <h1 className="font-story text-3xl font-semibold text-foreground mb-2 text-balance">Pick a genre</h1>
            <p className="text-muted-foreground mb-8">Choose the world you want to explore.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGenre(g.id)}
                  className={`group text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.97] ${
                    selectedGenre === g.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <g.icon className={`w-5 h-5 mb-2 ${selectedGenre === g.id ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="font-medium text-sm text-foreground">{g.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep("premise")}>Add a premise</Button>
              <Button variant="outline" onClick={() => setStep("tone")} disabled={!canProceed}>
                Choose tone <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "surprise" && (
          <div className="animate-fade-up text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-story text-3xl font-semibold text-foreground mb-2 text-balance">Feeling adventurous?</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">We'll generate a random premise and dive straight in.</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setStep("tone")}>Choose a tone first</Button>
              <Button onClick={handleStart} disabled={creating}>
                <Sparkles className="w-4 h-4 mr-1" /> {creating ? "Creating…" : "Surprise me"}
              </Button>
            </div>
          </div>
        )}

        {step === "tone" && (
          <div className="animate-fade-up">
            <h1 className="font-story text-3xl font-semibold text-foreground mb-2 text-balance">Set the tone</h1>
            <p className="text-muted-foreground mb-8">How should your story feel?</p>
            <div className="grid grid-cols-2 gap-3">
              {tones.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTone(t)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.97] ${
                    selectedTone === t ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="font-medium text-sm text-foreground">{t}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(mode === "genre" ? "genre" : "premise")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleStart} disabled={!selectedTone || creating}>
                {creating ? "Creating…" : "Begin writing"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

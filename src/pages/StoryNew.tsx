import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Sparkles, BookOpen, Skull, Heart, Wand2, Search, Rocket, Ghost, Sun, Moon, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { createStory } from "@/lib/story-api";
import { getTierLimits } from "@/lib/subscription";
import { GENRE_STARTERS, PREMISE_STARTERS } from "@/lib/story-starters";
import { TONE_PROFILES } from "@/lib/tone-profiles";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

const genres = [
  { id: "fantasy", label: "Fantasy", icon: Wand2, desc: "Magic, mythical worlds, epic quests" },
  { id: "scifi", label: "Sci-Fi", icon: Rocket, desc: "Future tech, space, alien encounters" },
  { id: "mystery", label: "Mystery", icon: Search, desc: "Puzzles, detectives, hidden truths" },
  { id: "romance", label: "Romance", icon: Heart, desc: "Love, passion, human connection" },
  { id: "horror", label: "Horror", icon: Ghost, desc: "Fear, suspense, the unknown" },
  { id: "thriller", label: "Thriller", icon: Skull, desc: "Danger, high stakes, twists" },
];

const storyLengthOptions = [
  { turns: 15, label: "Short", description: "About 15 turns" },
  { turns: 35, label: "Medium", description: "About 35 turns" },
  { turns: 45, label: "Long", description: "About 45+ turns" },
];

export default function StoryNew() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "scratch";
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, tier } = useAuth();

  const [step, setStep] = useState(mode === "genre" ? "genre" : mode === "surprise" ? "surprise" : "premise");
  const [premise, setPremise] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    searchParams.get("genre") || null
  );
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [customTone, setCustomTone] = useState("");
  const [targetTurns, setTargetTurns] = useState(35);
  const [creating, setCreating] = useState(false);
  const [atLimit, setAtLimit] = useState(false);
  const [storyCount, setStoryCount] = useState(0);
  const limits = getTierLimits(tier);
  const selectedGenreStarters = selectedGenre ? GENRE_STARTERS[selectedGenre] ?? [] : [];
  const trimmedCustomTone = customTone.trim();
  const effectiveTone = trimmedCustomTone.length >= 3 ? trimmedCustomTone : selectedTone || undefined;

  useEffect(() => {
    if (!user || limits.stories === Infinity) return;
    apiClient
      .getStoryCount()
      .then((count) => {
        setStoryCount(count);
        setAtLimit(count >= limits.stories);
      })
      .catch(() => {
        setStoryCount(0);
        setAtLimit(false);
      });
  }, [user, limits.stories]);

  const handleStart = async () => {
    if (!user) return;

    setCreating(true);

    // Check story limit — fail closed (block on error)
    const limits = getTierLimits(tier);
    if (limits.stories !== Infinity) {
      let count: number;
      try {
        count = await apiClient.getStoryCount();
      } catch {
        toast.error("Could not verify your story limit. Please try again.");
        setCreating(false);
        return;
      }

      if (count >= limits.stories) {
        toast.error(`You've reached the ${limits.stories}-story limit on your plan. Upgrade for more.`);
        setCreating(false);
        navigate("/pricing");
        return;
      }
    }
    try {
      const story = await createStory({
        userId: user.id,
        title: premise ? premise.slice(0, 60) : selectedGenre ? `${selectedGenre} story` : "Untitled Story",
        genre: selectedGenre || undefined,
        tone: effectiveTone,
        premise: premise || (mode === "surprise" ? "Surprise me with something unexpected" : undefined),
        targetTurns,
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
    step === "tone" ? !!effectiveTone && effectiveTone.length >= 3 : false;

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
        </button>
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95">
          {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        </button>
      </nav>

      <main className="pt-24 pb-16 px-6 max-w-2xl mx-auto">
        {atLimit && (
          <div className="animate-fade-up text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-story text-3xl font-semibold text-foreground mb-2 text-balance">Story limit reached</h1>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto">
              You've used all {limits.stories} {limits.stories === 1 ? "story" : "stories"} available on the <span className="font-medium text-foreground">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span> plan.
            </p>
            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              Upgrade your plan to create more stories and unlock additional features.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to stories
              </Button>
              <Button onClick={() => navigate("/pricing")}>
                <Crown className="w-4 h-4 mr-1" /> View plans
              </Button>
            </div>
          </div>
        )}

        {!atLimit && step === "premise" && (
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
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-sm font-medium text-foreground">Need a starting point?</h2>
                  <p className="text-xs text-muted-foreground">Pick a starter prompt and edit it however you like.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {PREMISE_STARTERS.map((starter) => (
                  <div key={starter} className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-foreground leading-relaxed">{starter}</p>
                    <div className="mt-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPremise(starter)}>
                        Try this starter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep("tone")} disabled={!canProceed}>
                Choose tone <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {!atLimit && step === "genre" && (
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
            {selectedGenreStarters.length > 0 && (
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-medium text-foreground mb-1">Starter prompts for {genres.find((g) => g.id === selectedGenre)?.label}</h2>
                <p className="text-xs text-muted-foreground mb-4">Use one as your premise, then move on to tone.</p>
                <div className="grid gap-3">
                  {selectedGenreStarters.map((starter) => (
                    <div key={starter} className="rounded-xl border border-border/70 bg-background px-4 py-3">
                      <p className="text-sm text-foreground leading-relaxed">{starter}</p>
                      <div className="mt-3">
                        <Button type="button" variant="outline" size="sm" onClick={() => setPremise(starter)}>
                          Try this starter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep("premise")}>Add a premise</Button>
              <Button variant="outline" onClick={() => setStep("tone")} disabled={!canProceed}>
                Choose tone <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {!atLimit && step === "surprise" && (
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

        {!atLimit && step === "tone" && (
          <div className="animate-fade-up">
            <h1 className="font-story text-3xl font-semibold text-foreground mb-2 text-balance">Set the tone</h1>
            <p className="text-muted-foreground mb-8">How should your story feel?</p>
            <div className="grid grid-cols-2 gap-3">
              {TONE_PROFILES.map((profile) => (
                <button
                  key={profile.label}
                  onClick={() => {
                    setSelectedTone(profile.label);
                    setCustomTone("");
                  }}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 active:scale-[0.97] ${
                    selectedTone === profile.label ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium text-sm text-foreground">{profile.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{profile.helper}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground mb-1">Custom tone</h2>
              <p className="text-xs text-muted-foreground mb-3">Write your own tone instead of using a preset.</p>
              <Input
                value={customTone}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setCustomTone(nextValue);
                  if (nextValue.trim().length >= 3) {
                    setSelectedTone(null);
                  }
                }}
                placeholder="Custom tone..."
                className="bg-background"
              />
            </div>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-medium text-foreground mb-1">Story length</h2>
              <p className="text-xs text-muted-foreground mb-4">Choose the approximate length this story should aim for.</p>
              <RadioGroup
                value={String(targetTurns)}
                onValueChange={(value) => setTargetTurns(Number(value))}
                className="grid gap-3 md:grid-cols-3"
              >
                {storyLengthOptions.map((option) => (
                  <label
                    key={option.turns}
                    htmlFor={`story-length-${option.turns}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all duration-200 active:scale-[0.99] ${
                      targetTurns === option.turns ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem id={`story-length-${option.turns}`} value={String(option.turns)} />
                    <span className="min-w-0">
                      <span className="block font-medium text-sm text-foreground">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(mode === "genre" ? "genre" : "premise")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleStart} disabled={!effectiveTone || effectiveTone.length < 3 || creating}>
                {creating ? "Creating…" : "Begin writing"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

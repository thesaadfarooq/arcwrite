import { useNavigate } from "react-router-dom";
import { BookOpen, Sun, Moon, LogIn, ArrowRight, Sparkles, GitBranch, Palette, Network, FileDown, Share2, PenLine } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Prose",
    description: "Describe what happens next in plain language. The AI transforms your direction into polished narrative prose — matching your story's tone, genre, and voice.",
  },
  {
    icon: GitBranch,
    title: "Branching Choices",
    description: "Every chapter ends with four AI-generated choices — safe, risky, emotional, and chaotic. Pick one, or write your own direction to steer the plot.",
  },
  {
    icon: Palette,
    title: "Genre & Tone",
    description: "Choose from six genres — fantasy, sci-fi, mystery, romance, horror, and thriller — and set the tone from dark and gritty to whimsical and light.",
  },
  {
    icon: Network,
    title: "Story Tree",
    description: "Visualize your entire narrative as a branching tree. See every path you've taken, revisit earlier chapters, and explore the roads not traveled.",
  },
  {
    icon: FileDown,
    title: "PDF Export",
    description: "Export your finished story as a beautifully formatted PDF. Share it, print it, or keep it as a polished record of your adventure.",
  },
  {
    icon: Share2,
    title: "Public Sharing",
    description: "Generate a public link to share your story with anyone. Readers can follow your narrative from beginning to end — no account needed.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: PenLine,
    step: 1,
    title: "Describe your idea",
    description: "Start with a premise — a sentence, a paragraph, or just a mood. Tell Arcwrite what kind of story you want, and it generates a rich opening chapter.",
  },
  {
    icon: GitBranch,
    step: 2,
    title: "Make choices",
    description: "At the end of each chapter, you're presented with four directions. Each choice type — safe, risky, emotional, chaotic — pushes the story in a different direction. Or write your own.",
  },
  {
    icon: Sparkles,
    step: 3,
    title: "AI writes the prose",
    description: "Based on your choice, the AI writes the next chapter. It remembers your characters, plot threads, and tone — building on everything that came before.",
  },
];

export default function Features() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Features — Arcwrite"
        description="Explore Arcwrite's AI story generation features: branching choices, genre customization, story tree visualization, PDF export, and public sharing."
        canonical="/features"
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95" aria-label="Toggle theme">
            {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
          </button>
          {user ? (
            <Button size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>
              <LogIn className="w-3.5 h-3.5 mr-1" /> Sign in
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-tight tracking-tight text-balance mb-5">
            Everything you need to write interactive fiction
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            Arcwrite combines AI prose generation with branching narrative design. You direct the plot — the AI handles the writing.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="p-6 rounded-2xl border border-border bg-card">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-medium text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground text-center mb-3">
            How it works
          </h2>
          <p className="text-muted-foreground text-center mb-14 max-w-md mx-auto">
            From idea to interactive story in three steps.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center md:text-left">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 mx-auto md:mx-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">Step {item.step}</div>
                  <h3 className="font-medium text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Start writing for free
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Create your first interactive story in minutes. No credit card required.
          </p>
          <Button size="lg" onClick={() => navigate(user ? "/story/new" : "/auth")}>
            Get started <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

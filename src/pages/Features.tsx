import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, GitBranch, Palette, Network, FileDown, Share2, PenLine } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { DemoStoryViewer } from "@/components/demo/DemoStoryViewer";
import { DEMO_TREES } from "@/lib/demo-stories";
import { Reveal, StaggerGroup } from "@/components/motion";

const FEATURES = [
  {
    icon: GitBranch,
    title: "Branching Choices",
    description: "Every turn ends with four AI-generated choices — safe, risky, emotional, and chaotic. Pick one, or write your own direction to steer the plot.",
  },
  {
    icon: Network,
    title: "Story Tree",
    description: "Visualize your entire narrative as a branching tree. See every path you've taken, revisit earlier turns, and explore the roads not traveled.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Prose",
    description: "Describe what happens next in plain language. The AI transforms your direction into polished narrative prose — matching your story's tone, genre, and voice.",
  },
  {
    icon: Palette,
    title: "Genre & Tone",
    description: "Choose from six genres — fantasy, sci-fi, mystery, romance, horror, and thriller — and set the tone from dark and gritty to whimsical and light.",
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
    description: "Start with a premise — a sentence, a paragraph, or just a mood. Tell Arcwrite what kind of story you want, and it generates a rich opening.",
  },
  {
    icon: GitBranch,
    step: 2,
    title: "Make choices",
    description: "At the end of each turn, you're presented with four directions. Each choice type — safe, risky, emotional, chaotic — pushes the story in a different direction. Or write your own.",
  },
  {
    icon: Sparkles,
    step: 3,
    title: "AI writes the prose",
    description: "Based on your choice, the AI writes the next turn. It remembers your characters, plot threads, and tone — building on everything that came before.",
  },
];

export default function Features() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Features — Arcwrite"
        description="Explore Arcwrite's AI story generation features: branching choices, genre customization, story tree visualization, PDF export, and public sharing."
        canonical="/features"
      />

      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-tight tracking-tight text-balance mb-5">
              Everything you need to write interactive fiction
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
              Arcwrite combines AI prose generation with branching narrative design. You direct the plot — the AI handles the writing.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Gradient divider: Hero → Demo */}
      <div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card) / 0.4))" }} />

      {/* Interactive demo */}
      <section className="py-16 px-6 bg-card/40">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground text-center mb-3">
              Explore a story
            </h2>
            <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
              Click any node in the tree to read that part of the story and see the path that led there.
            </p>
          </Reveal>
          <Reveal>
            <DemoStoryViewer nodes={DEMO_TREES.features.nodes} title={DEMO_TREES.features.title} />
          </Reveal>
        </div>
      </section>

      {/* Gradient divider: Demo → Features */}
      <div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--card) / 0.4), hsl(var(--background)))" }} />

      {/* Features grid */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <StaggerGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group p-6 rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4">
                    <Icon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-[5deg]" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </StaggerGroup>
        </div>
      </section>

      {/* Gradient divider: Features → How It Works */}
      <div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card) / 0.4))" }} />

      {/* How it works */}
      <section className="py-16 px-6 bg-card/40">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground text-center mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground text-center mb-14 max-w-md mx-auto">
              From idea to interactive story in three steps.
            </p>
          </Reveal>
          <StaggerGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          </StaggerGroup>
        </div>
      </section>

      {/* Gradient divider: How It Works → CTA */}
      <div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--card) / 0.4), hsl(var(--background)))" }} />

      {/* CTA */}
      <section className="py-16 px-6">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Start writing for free
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Create your first interactive story in minutes. No credit card required.
            </p>
            <Button size="lg" className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150" onClick={() => navigate(user ? "/story/new" : "/auth")}>
              Get started <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}

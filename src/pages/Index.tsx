import { useNavigate } from "react-router-dom";
import { BookOpen, PenLine, GitBranch, Sparkles, ArrowRight, Shield, Flame, Heart, Zap, Network, Palette, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { HeroGraphSequence } from "@/components/demo/HeroGraphSequence";

// ── Fake story data for the hero animation ──────────────────────────
const DEMO_PARAGRAPHS = [
  "Kael descended the slick stone steps, lantern swaying. The air tasted of iron and forgotten things.",
  "The passage opened into a vast chamber. In the center — a book bound in pale leather that seemed to breathe.",
];

const DEMO_CHOICES = [
  { type: "safe" as const, label: "Open the book carefully", icon: Shield, color: "choice-safe" },
  { type: "risky" as const, label: "Read the incantation aloud", icon: Flame, color: "choice-risky" },
  { type: "emotional" as const, label: "Remember his sister's warning", icon: Heart, color: "choice-emotional" },
  { type: "chaotic" as const, label: "Tear out the first page", icon: Zap, color: "choice-chaotic" },
];

const HOW_IT_WORKS = [
  {
    icon: PenLine,
    title: "Describe your idea",
    description: "Write a premise — a sentence, a paragraph, or just a vibe. The AI takes it from there.",
  },
  {
    icon: GitBranch,
    title: "Choose what happens",
    description: "After each turn, pick from AI-generated directions — or write your own twist.",
  },
  {
    icon: Sparkles,
    title: "Watch it unfold",
    description: "Your story grows chapter by chapter, branching into paths only you can explore.",
  },
];

// ── Typewriter hook ─────────────────────────────────────────────────
function useTypewriter(texts: string[], charDelay = 18, paragraphPause = 600) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const result: string[] = [];
      for (const text of texts) {
        if (cancelled) return;
        result.push("");
        setDisplayed([...result]);
        for (let i = 0; i <= text.length; i++) {
          if (cancelled) return;
          result[result.length - 1] = text.slice(0, i);
          setDisplayed([...result]);
          await new Promise((r) => setTimeout(r, charDelay));
        }
        await new Promise((r) => setTimeout(r, paragraphPause));
      }
      if (!cancelled) setDone(true);
    }
    // Small initial delay so the page settles
    const t = setTimeout(run, 800);
    return () => { cancelled = true; clearTimeout(t); };
  }, [texts, charDelay, paragraphPause]);

  return { displayed, done };
}

// ── How It Works vignette components ────────────────────────────────

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function HowItWorksVignette1({ stepIndex }: { stepIndex: number }) {
  const { ref, visible } = useInView();
  const { displayed, done } = useTypewriter(
    visible ? ["A young mage finds a book that breathes..."] : [],
    38,
    0
  );

  return (
    <div ref={ref} className="text-center md:text-left">
      {/* Mini input vignette */}
      <div className="mb-4 h-14 rounded-lg border border-border bg-card/80 px-3 py-2 flex items-center">
        <span className="font-story text-xs text-foreground/70 leading-snug">
          {displayed[0] ?? ""}
          {visible && !done && (
            <span className="inline-block w-[2px] h-[0.9em] bg-primary ml-0.5 animate-pulse align-middle" />
          )}
        </span>
      </div>
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 mx-auto md:mx-0">
        <PenLine className="w-5 h-5" />
      </div>
      <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">Step {stepIndex + 1}</div>
      <h3 className="font-medium text-foreground mb-1.5">{HOW_IT_WORKS[stepIndex].title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{HOW_IT_WORKS[stepIndex].description}</p>
    </div>
  );
}

const VIGNETTE2_PILLS = [
  { label: "safe", color: "choice-safe" },
  { label: "risky", color: "choice-risky" },
  { label: "emotional", color: "choice-emotional" },
  { label: "chaotic", color: "choice-chaotic" },
];

function HowItWorksVignette2({ stepIndex }: { stepIndex: number }) {
  const { ref, visible } = useInView();
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setHighlighted(true), VIGNETTE2_PILLS.length * 120 + 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  return (
    <div ref={ref} className="text-center md:text-left">
      {/* Choice pills vignette */}
      <div className="mb-4 h-14 flex flex-wrap items-center gap-1.5 px-1">
        {VIGNETTE2_PILLS.map((pill, i) => (
          <span
            key={pill.label}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all duration-300"
            style={{
              borderColor: `hsl(var(--${pill.color}) / 0.4)`,
              color: `hsl(var(--${pill.color}))`,
              backgroundColor:
                highlighted && pill.label === "safe"
                  ? `hsl(var(--${pill.color}) / 0.15)`
                  : `hsl(var(--${pill.color}) / 0.06)`,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(6px)",
              transitionDelay: `${i * 120}ms`,
              fontWeight: highlighted && pill.label === "safe" ? 700 : undefined,
            }}
          >
            {pill.label}
          </span>
        ))}
      </div>
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 mx-auto md:mx-0">
        <GitBranch className="w-5 h-5" />
      </div>
      <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">Step {stepIndex + 1}</div>
      <h3 className="font-medium text-foreground mb-1.5">{HOW_IT_WORKS[stepIndex].title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{HOW_IT_WORKS[stepIndex].description}</p>
    </div>
  );
}

const VIGNETTE3_NODES = [
  { x: 50, y: 12, r: 5 },
  { x: 25, y: 42, r: 4 },
  { x: 75, y: 42, r: 4 },
  { x: 50, y: 72, r: 4 },
];
const VIGNETTE3_EDGES = [
  [0, 1],
  [0, 2],
  [1, 3],
];

function HowItWorksVignette3({ stepIndex }: { stepIndex: number }) {
  const { ref, visible } = useInView();
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let count = 0;
    const interval = setInterval(() => {
      count += 1;
      setRevealedCount(count);
      if (count >= VIGNETTE3_NODES.length) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <div ref={ref} className="text-center md:text-left">
      {/* Tiny SVG graph vignette */}
      <div className="mb-4 h-14 flex items-center justify-start">
        <svg viewBox="0 0 100 85" className="w-20 h-14" aria-hidden="true">
          {VIGNETTE3_EDGES.map(([a, b], i) => {
            const na = VIGNETTE3_NODES[a];
            const nb = VIGNETTE3_NODES[b];
            const bothVisible = revealedCount > a && revealedCount > b;
            return (
              <line
                key={i}
                x1={na.x} y1={na.y}
                x2={nb.x} y2={nb.y}
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                style={{
                  opacity: bothVisible ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              />
            );
          })}
          {VIGNETTE3_NODES.map((n, i) => (
            <circle
              key={i}
              cx={n.x} cy={n.y} r={n.r}
              fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--card))"}
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              style={{
                opacity: revealedCount > i ? 1 : 0,
                transform: `scale(${revealedCount > i ? 1 : 0.4})`,
                transformOrigin: `${n.x}px ${n.y}px`,
                transition: "opacity 0.3s ease, transform 0.3s ease",
              }}
            />
          ))}
        </svg>
      </div>
      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 mx-auto md:mx-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">Step {stepIndex + 1}</div>
      <h3 className="font-medium text-foreground mb-1.5">{HOW_IT_WORKS[stepIndex].title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{HOW_IT_WORKS[stepIndex].description}</p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
const Index = () => {
  const navigate = useNavigate();
  const howRef = useRef<HTMLDivElement>(null);

  const { displayed, done: typingDone } = useTypewriter(DEMO_PARAGRAPHS, 16, 500);
  const [showChoices, setShowChoices] = useState(false);
  const [graphPhaseStarted, setGraphPhaseStarted] = useState(false);

  useEffect(() => {
    if (typingDone) {
      const t = setTimeout(() => setShowChoices(true), 400);
      return () => clearTimeout(t);
    }
  }, [typingDone]);

  useEffect(() => {
    if (showChoices) {
      const t = setTimeout(() => setGraphPhaseStarted(true), 1500);
      return () => clearTimeout(t);
    }
  }, [showChoices]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-up");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    if (howRef.current) observer.observe(howRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Arcwrite — AI Story Generator | Interactive Choose-Your-Own-Adventure Fiction"
        description="Create branching choose-your-own-adventure stories with AI. You direct the plot, AI writes the prose. Free interactive fiction writing tool with meaningful choices."
        canonical="/"
      />
      <Navbar />

      {/* Hero — text left, animated demo right */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — copy */}
          <div className="animate-fade-up">
            <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-[1.15] tracking-tight text-balance mb-5">
              You direct the story.
              <br />
              <span className="text-primary">AI writes it.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed text-pretty max-w-lg mb-8">
              Shape plots, steer characters, and craft entire novels — without writing a single paragraph yourself.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/story/new")}>
                Start writing <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Right — animated story demo */}
          <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
            {/* Fade edges */}
            <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
              style={{
                background: `
                  linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 8%, transparent 85%, hsl(var(--background)) 100%),
                  linear-gradient(to right, hsl(var(--background)) 0%, transparent 5%, transparent 95%, hsl(var(--background)) 100%)
                `,
              }}
            />

            <div className={`rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 md:p-8 max-h-[420px] overflow-hidden${graphPhaseStarted ? " animate-morph-shrink" : ""}`}>
              {/* Fake editor chrome */}
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/50">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-story text-sm font-medium text-foreground">The Pale Book</span>
                <span className="ml-auto text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Chapter 1</span>
              </div>

              {/* Typewriter text */}
              <div className="space-y-4 mb-6">
                {displayed.map((text, i) => (
                  <p key={i} className="font-story text-sm leading-relaxed text-foreground/80">
                    {text}
                    {i === displayed.length - 1 && !typingDone && (
                      <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 animate-pulse" />
                    )}
                  </p>
                ))}
              </div>

              {/* Choice cards appear after typing */}
              {showChoices && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">What happens next?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_CHOICES.map((choice, i) => {
                      const Icon = choice.icon;
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl border border-border bg-card/80 animate-slide-up"
                          style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: `hsl(var(--${choice.color}) / 0.12)`, color: `hsl(var(--${choice.color}))` }}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                              {choice.type}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-foreground/80">{choice.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {showChoices && <HeroGraphSequence triggered={showChoices} />}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border/50">
        <div ref={howRef} className="max-w-4xl mx-auto opacity-0">
          <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground text-center mb-3">
            How it works
          </h2>
          <p className="text-muted-foreground text-center mb-14 max-w-md mx-auto">
            Three steps. No writing experience needed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Vignette 1 — Describe your idea */}
            <HowItWorksVignette1 stepIndex={0} />
            {/* Vignette 2 — Choose what happens */}
            <HowItWorksVignette2 stepIndex={1} />
            {/* Vignette 3 — Watch it unfold */}
            <HowItWorksVignette3 stepIndex={2} />
          </div>
        </div>
      </section>

      {/* Features highlight strip */}
      <section className="py-16 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: GitBranch, title: "Branching choices", desc: "Four directions every turn" },
              { icon: Palette, title: "Genre & tone", desc: "Six genres, your voice" },
              { icon: Network, title: "Story tree", desc: "Visualize every path" },
              { icon: Share2, title: "Export & share", desc: "PDF, public links" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <button
                  key={i}
                  onClick={() => navigate("/features")}
                  className="p-4 rounded-xl border border-border bg-card/60 hover:bg-card transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary mb-3 group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium text-foreground mb-0.5">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to write your story?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Start for free. No credit card required.
          </p>
          <div className="flex items-center justify-center">
            <Button size="lg" onClick={() => navigate("/story/new")}>
              Get started <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;

import { useNavigate } from "react-router-dom";
import { PenLine, Sparkles, Shuffle, BookOpen, Sun, Moon, LogIn } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const heroRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

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
    if (heroRef.current) observer.observe(heroRef.current);
    if (cardsRef.current) observer.observe(cardsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">VibeWrite</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        </button>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div ref={heroRef} className="max-w-2xl mx-auto text-center opacity-0">
          <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-[1.15] tracking-tight text-balance mb-5">
            You direct the story.
            <br />
            <span className="text-primary">AI writes it.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty max-w-lg mx-auto">
            Shape plots, steer characters, and craft entire novels — without writing a single paragraph yourself.
          </p>
        </div>
      </section>

      {/* Entry Points */}
      <section className="pb-24 px-6">
        <div ref={cardsRef} className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0">
          <EntryCard
            icon={<PenLine className="w-5 h-5" />}
            title="Start from scratch"
            description="Describe your idea and let AI build from there"
            onClick={() => navigate("/story/new?mode=scratch")}
            delay="0ms"
          />
          <EntryCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Pick a genre"
            description="Choose a world — fantasy, thriller, romance, and more"
            onClick={() => navigate("/story/new?mode=genre")}
            delay="80ms"
          />
          <EntryCard
            icon={<Shuffle className="w-5 h-5" />}
            title="Surprise me"
            description="Get a random premise and start writing immediately"
            onClick={() => navigate("/story/new?mode=surprise")}
            delay="160ms"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-story">VibeWrite</span>
          <span>Stories you direct, AI delivers.</span>
        </div>
      </footer>
    </div>
  );
};

function EntryCard({
  icon,
  title,
  description,
  onClick,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  delay: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: delay }}
      className="group text-left p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
        {icon}
      </div>
      <h2 className="font-medium text-foreground mb-1.5">{title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

export default Index;

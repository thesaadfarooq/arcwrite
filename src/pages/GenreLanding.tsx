import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Wand2, Rocket, Search, Heart, Ghost, Skull } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import type { LucideIcon } from "lucide-react";
import { DemoStoryViewer } from "@/components/demo/DemoStoryViewer";
import { DEMO_TREES } from "@/lib/demo-stories";

interface GenreData {
  label: string;
  icon: LucideIcon;
  metaTitle: string;
  metaDescription: string;
  heroHeading: string;
  heroDescription: string;
  hooks: string[];
  conventions: string;
  demoTreeKey: string;
}

const GENRE_DATA: Record<string, GenreData> = {
  fantasy: {
    label: "Fantasy",
    icon: Wand2,
    metaTitle: "Fantasy AI Story Generator — Arcwrite",
    metaDescription: "Create branching fantasy adventures with AI. Build worlds of magic, mythical creatures, and epic quests where every choice shapes the narrative.",
    heroHeading: "Write your own fantasy adventure",
    heroDescription: "Conjure worlds of magic, mythical creatures, and ancient prophecies. Every choice you make shapes the quest — will you wield forbidden power or forge alliances in the dark?",
    hooks: [
      "A young mage discovers forbidden magic in a crumbling library — but the spells are alive, and they remember their last master.",
      "The kingdom's dragons haven't been seen in centuries. When one lands on the castle wall, it speaks your name.",
      "You inherit a map to a realm that shouldn't exist. The ink moves when no one is watching.",
      "An enchanted forest is growing over the capital city. The trees whisper that they're protecting it — from you.",
    ],
    conventions: "Arcwrite's AI understands fantasy conventions: world-building with internal logic, escalating stakes, magic systems with costs, and the tension between power and sacrifice. It weaves in mythical archetypes while keeping your specific story fresh.",
    demoTreeKey: "fantasy",
  },
  scifi: {
    label: "Sci-Fi",
    icon: Rocket,
    metaTitle: "Sci-Fi AI Story Generator — Arcwrite",
    metaDescription: "Build futuristic sci-fi narratives with AI. Explore space, advanced technology, and alien encounters in branching interactive stories.",
    heroHeading: "Build futuristic sci-fi narratives",
    heroDescription: "Explore uncharted star systems, navigate corporate conspiracies on orbital stations, or unravel the ethics of artificial consciousness. The future is yours to shape.",
    hooks: [
      "Your colony ship receives a signal from a star system that was supposed to be empty. The signal is your own distress call — dated 200 years in the future.",
      "Earth's first contact isn't with aliens. It's with a previous version of humanity that left the planet 50,000 years ago.",
      "You wake up in a lab with memories of a life you never lived. The scientist watching you has your face.",
      "A rogue AI offers to solve climate change in 48 hours. The price: it needs full control of every connected device on Earth.",
    ],
    conventions: "Arcwrite's AI handles hard and soft sci-fi alike: plausible technology extrapolation, first contact scenarios, time paradoxes, and the human cost of progress. It keeps the science grounded while letting imagination lead.",
    demoTreeKey: "scifi",
  },
  mystery: {
    label: "Mystery",
    icon: Search,
    metaTitle: "Mystery AI Story Generator — Arcwrite",
    metaDescription: "Craft detective stories and puzzles with AI. Uncover clues, interrogate suspects, and solve cases in branching mystery narratives.",
    heroHeading: "Craft mysteries worth solving",
    heroDescription: "Follow the clues, question unreliable witnesses, and piece together what really happened. Every choice opens new leads — and new suspects.",
    hooks: [
      "A locked-room murder in a snowbound manor. The victim's last word was your character's name — but you've never met them.",
      "A detective receives case files for crimes that haven't happened yet. The next file has today's date.",
      "An art forgery ring is exposed when a painting sold at auction turns out to be the original — the one in the museum is the fake.",
      "A missing persons case goes cold until the missing person starts sending postcards from places they've never been.",
    ],
    conventions: "Arcwrite's AI understands mystery mechanics: fair-play clue planting, red herrings that feel earned, rising tension through revelation, and the satisfaction of a twist that was there all along. It tracks suspects, motives, and alibis as your investigation unfolds.",
    demoTreeKey: "mystery",
  },
  romance: {
    label: "Romance",
    icon: Heart,
    metaTitle: "Romance AI Story Generator — Arcwrite",
    metaDescription: "Write love stories with meaningful choices using AI. Explore relationships, emotional depth, and romantic tension in interactive narratives.",
    heroHeading: "Write love stories with real choices",
    heroDescription: "Navigate the messy, beautiful complexity of human connection. Every choice deepens or complicates the relationship — because real love stories aren't simple.",
    hooks: [
      "You're paired with your worst critic for a month-long research expedition. The fieldwork is remote, the quarters are tight, and the aurora borealis is impossibly beautiful.",
      "A bookshop owner keeps finding handwritten notes in returned books — all addressed to someone with your character's name. The handwriting is gorgeous.",
      "Two rival chefs are forced to collaborate on a pop-up restaurant. The food is electric. So is the tension.",
      "You reconnect with a childhood friend at a wedding. They remember a promise you made at age twelve — one you've completely forgotten.",
    ],
    conventions: "Arcwrite's AI handles romance with emotional intelligence: slow-burn tension, meaningful dialogue, vulnerability as strength, and the push-pull of characters who want different things. It builds chemistry through conflict, not just attraction.",
    demoTreeKey: "romance",
  },
  horror: {
    label: "Horror",
    icon: Ghost,
    metaTitle: "Horror AI Story Generator — Arcwrite",
    metaDescription: "Create terrifying horror stories with AI. Build dread, face the unknown, and survive in branching interactive horror narratives.",
    heroHeading: "Face what lurks in the dark",
    heroDescription: "Something is wrong and getting worse. Every choice is a gamble between safety and understanding — because in horror, knowing the truth might be worse than the fear.",
    hooks: [
      "You move into a house where every previous owner left on the same date. That date is three days from now.",
      "A podcast about unsolved disappearances starts receiving voicemails from the missing. They all say the same thing: 'I can see you listening.'",
      "The new medication works perfectly — except for the side effect no one mentioned. You can see what people look like when they die.",
      "A support group for people who survived near-death experiences. One night, a new member describes the afterlife — and it matches your recurring nightmare exactly.",
    ],
    conventions: "Arcwrite's AI understands horror pacing: slow dread over jump scares, the power of the unseen, isolation that makes help impossible, and the creeping realization that the rules of the world have changed. It escalates tension methodically.",
    demoTreeKey: "horror",
  },
  thriller: {
    label: "Thriller",
    icon: Skull,
    metaTitle: "Thriller AI Story Generator — Arcwrite",
    metaDescription: "Write high-stakes thriller stories with AI. Navigate danger, deception, and impossible deadlines in branching interactive narratives.",
    heroHeading: "Every second counts",
    heroDescription: "The clock is ticking, the stakes are lethal, and trust is a luxury you can't afford. Every choice could save you — or spring the trap.",
    hooks: [
      "You witness a murder from your apartment window. The killer looks up — directly at you. Your phone buzzes: 'I know where you live.'",
      "A journalist receives proof that a senator is planning something catastrophic. The deadline to publish is 6 hours. The source just went missing.",
      "You're a hostage negotiator. The caller isn't making demands — they're giving you instructions. If you don't follow them, someone in your family dies.",
      "A cybersecurity analyst discovers a backdoor in the banking system. It's been active for three years. The access logs show it was installed from their own workstation.",
    ],
    conventions: "Arcwrite's AI handles thriller pacing: relentless momentum, ticking clocks, reveals that raise the stakes instead of resolving them, and the constant question of who can be trusted. It keeps the pressure building chapter by chapter.",
    demoTreeKey: "thriller",
  },
};

const VALID_GENRES = Object.keys(GENRE_DATA);

export default function GenreLanding() {
  const { genre } = useParams<{ genre: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!genre || !VALID_GENRES.includes(genre)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <SEO title="Page Not Found — Arcwrite" noindex />
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Genre not found</p>
          <Link to="/features" className="text-primary underline hover:text-primary/90">View all features</Link>
        </div>
      </div>
    );
  }

  const data = GENRE_DATA[genre];
  const Icon = data.icon;

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title={data.metaTitle}
        description={data.metaDescription}
        canonical={`/genres/${genre}`}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Genres", url: "/features" },
          { name: data.label, url: `/genres/${genre}` },
        ]}
      />

      <Navbar />

      {/* Hero — heading + CTA up top */}
      <section className="pt-28 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
            <Icon className="w-7 h-7" />
          </div>
          <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-tight tracking-tight text-balance mb-5">
            {data.heroHeading}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            {data.heroDescription}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}>
              Start writing <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <a
              href="#demo"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              See it in action <ChevronDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Interactive demo */}
      <section id="demo" className="py-16 px-6 border-t border-border/50 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-3">
            Try the experience
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
            Make choices in the editor, then switch to the tree to see your story's shape.
          </p>
          <DemoStoryViewer
            nodes={DEMO_TREES[data.demoTreeKey].nodes}
            title={DEMO_TREES[data.demoTreeKey].title}
          />
        </div>
      </section>

      {/* Genre conventions */}
      <section className="py-16 px-6 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-story text-2xl font-semibold text-foreground mb-4">
            Built for {data.label.toLowerCase()}
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {data.conventions}
          </p>
        </div>
      </section>

      {/* Story starters — inspiration before the final push */}
      <section className="py-16 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-3">
            Story starters
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
            Pick a premise or bring your own — the AI takes it from there.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.hooks.map((hook, i) => (
              <button
                key={i}
                onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}
                className="p-5 rounded-2xl border border-border bg-card hover:bg-card/80 hover:border-primary/30 transition-colors text-left group"
              >
                <p className="font-story text-sm leading-relaxed text-foreground/80 group-hover:text-foreground/90 transition-colors">{hook}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to write?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Free to start. No credit card needed.
          </p>
          <Button size="lg" onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}>
            Begin your {data.label.toLowerCase()} story <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

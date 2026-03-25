# SEO Foundation Phase — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Arcwrite's indexable public footprint with per-route metadata, new content pages (features + 6 genre landing pages), pricing enrichment, internal linking via shared footer, and structured data.

**Architecture:** Install `react-helmet-async` and wrap the app in `<HelmetProvider>`. Create a reusable `<SEO>` component used by every public page. Add new routes for `/features` and `/genres/:genre`. Enrich the pricing page with content sections and FAQ. Replace the landing page's inline footer with a shared `<Footer>` component used across all public pages.

**Tech Stack:** React 18, react-helmet-async, react-router-dom v6, TypeScript, Tailwind CSS, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-25-seo-foundation-design.md`

---

## Chunk 1: Infrastructure — react-helmet-async, SEO component, HelmetProvider

### Task 1: Install react-helmet-async and create the SEO component

**Files:**
- Modify: `package.json`
- Create: `src/components/SEO.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Install react-helmet-async**

```bash
npm install react-helmet-async
```

Expected: Package added to `package.json` dependencies. No errors.

- [ ] **Step 2: Create `src/components/SEO.tsx`**

This is the reusable metadata component. Every public page will use it.

```tsx
import { Helmet } from "react-helmet-async";

const BASE_URL = "https://arcwrite.app";
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  faqItems?: FAQItem[];
}

export default function SEO({ title, description, canonical, noindex, breadcrumbs, faqItems }: SEOProps) {
  const fullUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  const breadcrumbLd = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${BASE_URL}${item.url}`,
        })),
      }
    : null;

  const faqLd = faqItems
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }
    : null;

  return (
    <Helmet>
      <title>{title}</title>
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {description && <meta name="description" content={description} />}
      {fullUrl && <link rel="canonical" href={fullUrl} />}
      {description && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {fullUrl && <meta property="og:url" content={fullUrl} />}
      {description && <meta property="og:type" content="website" />}
      {description && <meta property="og:site_name" content="Arcwrite" />}
      {description && <meta property="og:image" content={DEFAULT_IMAGE} />}
      {description && <meta name="twitter:card" content="summary_large_image" />}
      {description && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {description && <meta name="twitter:image" content={DEFAULT_IMAGE} />}
      {breadcrumbLd && (
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      )}
      {faqLd && (
        <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
      )}
    </Helmet>
  );
}
```

- [ ] **Step 3: Wrap App in HelmetProvider**

In `src/App.tsx`, add `HelmetProvider` as the outermost wrapper.

Add import at the top:
```tsx
import { HelmetProvider } from "react-helmet-async";
```

Wrap the entire App component — change the `App` const from:
```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
```
to:
```tsx
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
```

And close it — change the end from:
```tsx
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
```
to:
```tsx
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </HelmetProvider>
);
```

- [ ] **Step 4: Remove static canonical from `index.html`**

In `index.html`, remove line 7:
```html
    <link rel="canonical" href="https://arcwrite.app/" />
```

Each page now sets its own canonical via `<SEO>`.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/SEO.tsx src/App.tsx index.html
git commit -m "feat: add react-helmet-async with reusable SEO component"
```

---

### Task 2: Add SEO tags to existing pages

**Files:**
- Modify: `src/pages/Index.tsx`
- Modify: `src/pages/Pricing.tsx`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/pages/ResetPassword.tsx`
- Modify: `src/pages/NotFound.tsx`

- [ ] **Step 1: Add SEO to Index.tsx**

Add import at the top of `src/pages/Index.tsx`:
```tsx
import SEO from "@/components/SEO";
```

Add `<SEO>` as the first child inside the root `<div>`:
```tsx
  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Arcwrite — AI Story Generator | Interactive Choose-Your-Own-Adventure Fiction"
        description="Create branching choose-your-own-adventure stories with AI. You direct the plot, AI writes the prose. Free interactive fiction writing tool with meaningful choices."
        canonical="/"
      />
      {/* Nav */}
```

- [ ] **Step 2: Add SEO to Pricing.tsx**

Add import at top of `src/pages/Pricing.tsx`:
```tsx
import SEO from "@/components/SEO";
```

Add `<SEO>` as the first child inside the root `<div>`:
```tsx
  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Pricing & Plans — Arcwrite"
        description="Choose the right Arcwrite plan for your interactive fiction writing. Start free with 2 stories, or upgrade for more stories, PDF export, and the best AI models."
        canonical="/pricing"
      />
      <nav className="sticky top-0 ...
```

- [ ] **Step 3: Add noindex SEO to Auth.tsx**

Add import at top of `src/pages/Auth.tsx`:
```tsx
import SEO from "@/components/SEO";
```

Add `<SEO>` inside the root `<div>`, before the theme toggle button:
```tsx
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 transition-colors duration-500">
      <SEO title="Sign In — Arcwrite" noindex />
      {/* Theme toggle */}
```

- [ ] **Step 4: Add noindex SEO to ResetPassword.tsx**

Add import at top of `src/pages/ResetPassword.tsx`:
```tsx
import SEO from "@/components/SEO";
```

Add `<SEO>` inside the root `<div>`:
```tsx
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <SEO title="Reset Password — Arcwrite" noindex />
      <div className="w-full max-w-sm animate-fade-up">
```

- [ ] **Step 5: Add noindex SEO to NotFound.tsx**

Add import at top of `src/pages/NotFound.tsx`:
```tsx
import SEO from "@/components/SEO";
```

Add `<SEO>` inside the root `<div>`:
```tsx
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEO title="Page Not Found — Arcwrite" noindex />
      <div className="text-center">
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Index.tsx src/pages/Pricing.tsx src/pages/Auth.tsx src/pages/ResetPassword.tsx src/pages/NotFound.tsx
git commit -m "feat: add per-route SEO metadata to all existing pages"
```

---

## Chunk 2: Shared Footer and Sitemap

### Task 3: Create shared Footer component

**Files:**
- Create: `src/components/Footer.tsx`
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Create `src/components/Footer.tsx`**

```tsx
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

const PAGE_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
];

const GENRE_LINKS = [
  { label: "Fantasy", to: "/genres/fantasy" },
  { label: "Sci-Fi", to: "/genres/scifi" },
  { label: "Mystery", to: "/genres/mystery" },
  { label: "Romance", to: "/genres/romance" },
  { label: "Horror", to: "/genres/horror" },
  { label: "Thriller", to: "/genres/thriller" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/50 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-story font-semibold text-foreground">Arcwrite</span>
            </div>
            <p className="text-xs text-muted-foreground">Stories you direct, AI delivers.</p>
          </div>

          {/* Pages */}
          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">Pages</h4>
            <ul className="space-y-2">
              {PAGE_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h4 className="text-xs font-medium text-foreground uppercase tracking-wider mb-3">Genres</h4>
            <ul className="space-y-2">
              {GENRE_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 text-center">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Arcwrite. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Replace inline footer in Index.tsx**

In `src/pages/Index.tsx`, add import:
```tsx
import Footer from "@/components/Footer";
```

Replace the existing inline footer (lines 267-275):
```tsx
      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-story">Arcwrite</span>
          </div>
          <span className="text-xs">Stories you direct, AI delivers.</span>
        </div>
      </footer>
```

With:
```tsx
      <Footer />
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Footer.tsx src/pages/Index.tsx
git commit -m "feat: add shared footer with internal links"
```

---

### Task 4: Update sitemap

**Files:**
- Modify: `public/sitemap.xml`

- [ ] **Step 1: Replace `public/sitemap.xml`**

Replace the entire file with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://arcwrite.app/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/features</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/genres/fantasy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/genres/scifi</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/genres/mystery</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/genres/romance</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/genres/horror</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arcwrite.app/genres/thriller</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

- [ ] **Step 2: Commit**

```bash
git add public/sitemap.xml
git commit -m "feat: update sitemap with new pages, remove auth"
```

---

## Chunk 3: Features Page

### Task 5: Create Features page and add route

**Files:**
- Create: `src/pages/Features.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/pages/Features.tsx`**

```tsx
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
```

- [ ] **Step 2: Add route in App.tsx**

In `src/App.tsx`, add the import:
```tsx
import Features from "./pages/Features.tsx";
```

Add the route inside `<Routes>`, after the index route:
```tsx
    <Route path="/features" element={<Features />} />
```

So the routes section becomes:
```tsx
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/features" element={<Features />} />
    <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
    ...
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Features.tsx src/App.tsx
git commit -m "feat: add features page with SEO metadata"
```

---

## Chunk 4: Genre Landing Pages

### Task 6: Create genre landing page and add route

**Files:**
- Create: `src/pages/GenreLanding.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/StoryNew.tsx`

- [ ] **Step 1: Create `src/pages/GenreLanding.tsx`**

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Sun, Moon, LogIn, ArrowRight, Wand2, Rocket, Search, Heart, Ghost, Skull } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
import type { LucideIcon } from "lucide-react";

interface GenreData {
  label: string;
  icon: LucideIcon;
  metaTitle: string;
  metaDescription: string;
  heroHeading: string;
  heroDescription: string;
  hooks: string[];
  conventions: string;
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
  },
};

const VALID_GENRES = Object.keys(GENRE_DATA);

export default function GenreLanding() {
  const { genre } = useParams<{ genre: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  if (!genre || !VALID_GENRES.includes(genre)) {
    // Render 404-style content for invalid genres
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <SEO title="Page Not Found — Arcwrite" noindex />
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Genre not found</p>
          <a href="/features" className="text-primary underline hover:text-primary/90">View all features</a>
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
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary mx-auto mb-6">
            <Icon className="w-7 h-7" />
          </div>
          <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-tight tracking-tight text-balance mb-5">
            {data.heroHeading}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            {data.heroDescription}
          </p>
        </div>
      </section>

      {/* Story hooks */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-3">
            What you can create
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
            Here are some story ideas to get you started.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.hooks.map((hook, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card">
                <p className="font-story text-sm leading-relaxed text-foreground/80">{hook}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Genre conventions */}
      <section className="py-16 px-6 border-t border-border/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-story text-2xl font-semibold text-foreground mb-4">
            How Arcwrite handles {data.label.toLowerCase()}
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {data.conventions}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-story text-2xl font-semibold text-foreground mb-4">
            Start a {data.label.toLowerCase()} story
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Jump straight into a {data.label.toLowerCase()} adventure. Free to start, no credit card needed.
          </p>
          <Button size="lg" onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}>
            Begin writing <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Add genre route in App.tsx**

In `src/App.tsx`, add the import:
```tsx
import GenreLanding from "./pages/GenreLanding.tsx";
```

Add the route after the features route:
```tsx
    <Route path="/genres/:genre" element={<GenreLanding />} />
```

- [ ] **Step 3: Pre-select genre in StoryNew.tsx from query param**

In `src/pages/StoryNew.tsx`, the component already reads `searchParams`. Change line 40 from:

```tsx
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
```

to:

```tsx
  const [selectedGenre, setSelectedGenre] = useState<string | null>(
    searchParams.get("genre") || null
  );
```

This way, when a user clicks "Begin writing" on a genre page (which links to `/story/new?mode=genre&genre=fantasy`), the genre is pre-selected.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/GenreLanding.tsx src/App.tsx src/pages/StoryNew.tsx
git commit -m "feat: add genre landing pages with SEO and pre-selection"
```

---

## Chunk 5: Pricing Page Enrichment

### Task 7: Add content sections and FAQ to pricing page

**Files:**
- Modify: `src/pages/Pricing.tsx`

- [ ] **Step 1: Add FAQ data, content sections, and footer to Pricing.tsx**

In `src/pages/Pricing.tsx`, add imports at the top:
```tsx
import SEO from "@/components/SEO";
import Footer from "@/components/Footer";
```

Add the FAQ data constant after the `tierFeatures` constant (after line 17):

```tsx
const FAQ_ITEMS = [
  {
    question: "Can I try Arcwrite for free?",
    answer: "Yes. The Free plan lets you create 2 stories with up to 5 chapters each. No credit card required.",
  },
  {
    question: "What happens when I hit my story limit?",
    answer: "You can still read and share your existing stories. To create new ones, upgrade your plan or delete an existing story to free up a slot.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You can cancel your subscription at any time from the customer portal. You'll keep access until the end of your billing period.",
  },
  {
    question: "What AI models does Arcwrite use?",
    answer: "Free and Plus plans use standard AI models optimized for interactive fiction. Pro unlocks the best available models for richer, more nuanced prose.",
  },
  {
    question: "Can I export my stories?",
    answer: "Plus and Pro plans include PDF export. Your story is formatted as a readable document with all the chapters you've written.",
  },
  {
    question: "What are public sharing links?",
    answer: "Pro users can generate a public link for any story. Anyone with the link can read the full story — no account needed. Great for sharing your work.",
  },
];
```

Add `<SEO>` as the first child inside the root `<div>`, passing the FAQ items:
```tsx
  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Pricing & Plans — Arcwrite"
        description="Choose the right Arcwrite plan for your interactive fiction writing. Start free with 2 stories, or upgrade for more stories, PDF export, and the best AI models."
        canonical="/pricing"
        faqItems={FAQ_ITEMS}
      />
      <nav className="sticky top-0 ...
```

Add the content sections inside `<main>`, after the "Refresh subscription status" block (before the closing `</main>` tag on line 213). Also add `<Footer />` after `</main>`, before the closing `</div>`:

```tsx
      {/* Additional content sections */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        {/* What's included */}
        <section className="mb-16">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
            What's included in every plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {["AI-powered story generation", "Branching narrative choices", "Story tree visualization", "Six genres and six tones", "Dark and light themes", "Auto-save"].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* Who each plan is for */}
        <section className="mb-16">
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
            Who each plan is for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-2">Free</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Perfect for trying out interactive fiction or writing a short story. Get a feel for AI-assisted storytelling with two full stories.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-2">Plus</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For regular writers who want longer stories and more of them. Includes PDF export so you can keep polished copies of your work.
              </p>
            </div>
            <div className="p-5 rounded-2xl border border-border bg-card">
              <h3 className="font-medium text-foreground mb-2">Pro</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For power users who want unlimited creation, public sharing links, and the best AI models for richer, more nuanced prose.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <h3 className="font-medium text-foreground mb-1">{item.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Pricing.tsx
git commit -m "feat: enrich pricing page with content sections, FAQ, and SEO"
```

---

## Chunk 6: Final Verification

### Task 8: Build and verify everything works together

- [ ] **Step 1: Full build**

```bash
npm run build
```

Expected: Clean build, no errors. All new pages should be accessible in the built output.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors introduced by the changes. Pre-existing `no-explicit-any` warnings are acceptable.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: All existing tests pass. No test failures introduced.

- [ ] **Step 4: Manual verification with dev server**

Start the dev server:
```bash
npm run dev
```

Verify in the browser:
1. `/` — Landing page loads, has shared footer with links, browser tab shows "Arcwrite — AI Story Generator..."
2. `/features` — Features page loads, shows 6 features + how it works + CTA + footer
3. `/genres/fantasy` — Genre page loads, shows fantasy content + hooks + CTA + footer
4. `/genres/scifi` — Sci-fi page loads correctly
5. `/genres/mystery` — Mystery page loads correctly
6. `/genres/romance` — Romance page loads correctly
7. `/genres/horror` — Horror page loads correctly
8. `/genres/thriller` — Thriller page loads correctly
9. `/genres/invalid` — Shows 404 content
10. `/pricing` — Pricing page loads, scroll down to see new content sections + FAQ + footer
11. `/auth` — Browser tab shows "Sign In — Arcwrite" (view source to confirm no canonical/OG tags)
12. Genre CTA: Click "Begin writing" on a genre page → lands on `/story/new?mode=genre&genre=fantasy` with genre pre-selected
13. `/reset-password` — Browser tab shows "Reset Password — Arcwrite"
14. `/nonexistent-route` — Shows 404, browser tab shows "Page Not Found — Arcwrite"
15. View page source on `/pricing` — confirm `FAQPage` JSON-LD is present
16. View page source on `/genres/fantasy` — confirm `BreadcrumbList` JSON-LD is present
17. View `public/sitemap.xml` — confirm `/auth` is removed, all 9 new URLs present
18. Confirm `index.html` no longer has a static `<link rel="canonical">` tag
19. Click footer links on any page — confirm they navigate correctly

- [ ] **Step 5: Final commit if any fixes needed**

Only if changes were needed during verification:
```bash
git add -A
git commit -m "fix: address issues found during SEO verification"
```

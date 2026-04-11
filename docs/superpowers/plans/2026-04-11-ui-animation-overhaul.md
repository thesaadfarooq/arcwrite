# UI Animation Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Framer Motion scroll-triggered animations, navbar scroll behavior, section gradient transitions, and micro-interactions to all public-facing pages (Landing, Genre, Features, Pricing, Auth) while preserving the existing dark literary identity.

**Architecture:** Three reusable motion components (`Reveal`, `StaggerGroup`, `useNavbarScroll`) in `src/components/motion/`. Pages wrap existing JSX in these components — no layout or structural changes. CSS handles card/button micro-interactions. All motion respects `prefers-reduced-motion`.

**Tech Stack:** Framer Motion (~32KB gzip), React 18, Tailwind CSS, existing shadcn/ui components.

---

## File Structure

**New files:**
- `src/components/motion/Reveal.tsx` — Scroll-triggered fade+translate wrapper (~40 lines)
- `src/components/motion/StaggerGroup.tsx` — Assigns incremental delays to children (~35 lines)
- `src/components/motion/useNavbarScroll.ts` — Hook for navbar show/hide/background (~40 lines)
- `src/components/motion/index.ts` — Barrel export (~4 lines)

**Modified files:**
- `src/components/Navbar.tsx` — Add scroll-triggered transparency/hide behavior
- `src/pages/Index.tsx` — Wrap sections in Reveal/StaggerGroup, add section dividers
- `src/pages/GenreLanding.tsx` — Wrap sections in Reveal/StaggerGroup, add section dividers
- `src/pages/Features.tsx` — Wrap sections in Reveal/StaggerGroup
- `src/pages/Pricing.tsx` — Wrap sections in Reveal/StaggerGroup
- `src/pages/Auth.tsx` — Add AnimatePresence for mode transitions, Framer card entrance

---

### Task 1: Install Framer Motion

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install framer-motion**

```bash
npm install framer-motion
```

- [ ] **Step 2: Verify installation**

Run: `node -e "require('framer-motion/package.json').version"`
Expected: Prints the installed version (e.g., `11.x.x`)

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion dependency for UI animation overhaul"
```

---

### Task 2: Create `Reveal.tsx` — Scroll-triggered reveal component

**Files:**
- Create: `src/components/motion/Reveal.tsx`

- [ ] **Step 1: Create the motion directory**

```bash
mkdir -p src/components/motion
```

- [ ] **Step 2: Write `Reveal.tsx`**

```tsx
import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Direction = "up" | "down" | "left" | "right";

interface RevealProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 20 },
  down: { x: 0, y: -20 },
  left: { x: 20, y: 0 },
  right: { x: -20, y: 0 },
};

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className,
}: RevealProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef(null);

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const scale = isMobile ? 0.6 : 1;
  const offset = offsets[direction];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: offset.x * scale, y: offset.y * scale }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: isMobile ? 0.1 : 0.2 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --skipLibCheck src/components/motion/Reveal.tsx 2>&1 || echo "Checking via build..." && npm run build`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/motion/Reveal.tsx
git commit -m "feat: add Reveal scroll-triggered animation component"
```

---

### Task 3: Create `StaggerGroup.tsx` — Incremental delay wrapper

**Files:**
- Create: `src/components/motion/StaggerGroup.tsx`

- [ ] **Step 1: Write `StaggerGroup.tsx`**

```tsx
import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";

type Direction = "up" | "down" | "left" | "right";

interface StaggerGroupProps {
  children: React.ReactNode;
  stagger?: number;
  direction?: Direction;
  className?: string;
}

export function StaggerGroup({
  children,
  stagger = 0.1,
  direction = "up",
  className,
}: StaggerGroupProps) {
  const prefersReduced = useReducedMotion();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const effectiveStagger = prefersReduced || isMobile ? 0 : stagger;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {React.Children.map(children, (child, index) => (
        <Reveal direction={direction} delay={index * effectiveStagger}>
          {child}
        </Reveal>
      ))}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/StaggerGroup.tsx
git commit -m "feat: add StaggerGroup staggered animation component"
```

---

### Task 4: Create `useNavbarScroll.ts` — Navbar scroll behavior hook

**Files:**
- Create: `src/components/motion/useNavbarScroll.ts`

- [ ] **Step 1: Write `useNavbarScroll.ts`**

```ts
import { useEffect, useState, useRef } from "react";

interface NavbarScrollState {
  isScrolled: boolean;
  isVisible: boolean;
}

export function useNavbarScroll(): NavbarScrollState {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsScrolled(y > 50);

        if (y < 100) {
          setIsVisible(true);
        } else {
          const delta = y - lastScrollY.current;
          if (Math.abs(delta) > 5) {
            setIsVisible(delta < 0);
          }
        }

        lastScrollY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return { isScrolled, isVisible };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/motion/useNavbarScroll.ts
git commit -m "feat: add useNavbarScroll hook for navbar show/hide behavior"
```

---

### Task 5: Create barrel export and verify motion library

**Files:**
- Create: `src/components/motion/index.ts`

- [ ] **Step 1: Write `index.ts`**

```ts
export { Reveal } from "./Reveal";
export { StaggerGroup } from "./StaggerGroup";
export { useNavbarScroll } from "./useNavbarScroll";
```

- [ ] **Step 2: Verify full build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run existing tests to ensure nothing broke**

Run: `npm run test`
Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/motion/index.ts
git commit -m "feat: add motion component barrel export"
```

---

### Task 6: Update Navbar with scroll behavior

**Files:**
- Modify: `src/components/Navbar.tsx`

The navbar currently has a fixed `bg-background/80 backdrop-blur-sm border-b border-border/50` style. We change it to:
- **At top:** Transparent background, no border, no blur
- **Scrolled past 50px:** Fades in `bg-background/80 backdrop-blur-sm border-b border-border/50`
- **Scrolling down (past 100px):** Slides up off screen with `translateY(-100%)`
- **Scrolling up:** Slides back down

All transitions use CSS (GPU-composited), not Framer Motion.

- [ ] **Step 1: Update `Navbar.tsx`**

Add the `useNavbarScroll` import at the top of the file, after the existing imports:

```tsx
import { useNavbarScroll } from "@/components/motion";
```

Inside the `Navbar` function body, after the existing `const [sheetOpen, setSheetOpen] = useState(false);` line, add:

```tsx
const { isScrolled, isVisible } = useNavbarScroll();
```

Replace the opening `<nav>` tag (the one with the fixed positioning and background classes) with:

```tsx
<nav
  className={cn(
    "fixed left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300",
    isScrolled
      ? "bg-background/80 backdrop-blur-sm border-b border-border/50"
      : "bg-transparent border-b border-transparent",
  )}
  style={{
    top: "var(--promo-banner-h, 0px)",
    transform: isVisible ? "translateY(0)" : "translateY(-100%)",
  }}
>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass. The navbar tests (if any) should not break since the hook returns defaults (isScrolled=false, isVisible=true) on initial render.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: add navbar scroll hide/show and transparent-to-solid transition"
```

---

### Task 7: Add micro-interaction CSS for cards, buttons, nav links, and icons

**Files:**
- Modify: `src/components/Navbar.tsx` (nav link underline)
- No new CSS files needed — Tailwind utility classes handle everything

This task adds CSS-only micro-interactions that apply globally. They're implemented via Tailwind classes added directly to the page JSX in subsequent tasks:

**Card hover pattern** (applied in Tasks 8-11):
```
@media (hover: hover) — translateY(-2px), shadow increase, border-color shift to primary/30
```
Classes to add to card elements: `@media(hover:hover)` via Tailwind: `hover:[@media(hover:hover)]:` is not needed — Tailwind's `hover:` already respects `@media (hover: hover)` with the `hoverOnlyWhenSupported` future flag. Since we don't have that flag, we'll use the group pattern with simple `hover:` classes, which is fine for desktop.

Card hover classes: `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30`

**Primary button hover/tap** — CSS classes added to all primary `<Button>` elements across pages: `hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150`. Apply to every `<Button size="lg">` CTA button in Tasks 8-12.

**Nav link underline** — pseudo-element slide-in on hover.

- [ ] **Step 1: Add nav link underline styles to Navbar.tsx**

In `src/components/Navbar.tsx`, update the desktop nav link `<Link>` to include an underline effect. Replace the desktop nav link block:

Find the desktop nav links `{navLinks.map((link) => (` block and replace each `<Link>` className to add the underline:

```tsx
<Link
  key={link.to}
  to={link.to}
  className={cn(
    "relative text-sm transition-colors hover:text-foreground",
    "after:absolute after:left-0 after:bottom-0 after:h-[1px] after:bg-primary after:transition-all after:duration-200",
    isActive(link.to)
      ? "text-foreground font-medium after:w-full"
      : "text-muted-foreground after:w-0 hover:after:w-full",
  )}
>
  {link.label}
</Link>
```

- [ ] **Step 2: Verify build and test**

Run: `npm run build && npm run test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: add nav link underline slide-in hover effect"
```

---

### Task 8: Apply animations to Landing page (`Index.tsx`)

**Files:**
- Modify: `src/pages/Index.tsx`

Changes:
1. Replace manual IntersectionObserver with `<Reveal>` / `<StaggerGroup>`
2. Hero: staggered fade-up on text elements, delay on demo container
3. How It Works: `<StaggerGroup>` on the 3 step cards
4. Features Strip: `<StaggerGroup>` on the 4 feature cards, add card hover classes
5. CTA: `<Reveal>` wrapper
6. Section background alternation with gradient dividers

- [ ] **Step 1: Update imports**

At the top of `src/pages/Index.tsx`, add the Reveal/StaggerGroup import:

```tsx
import { Reveal, StaggerGroup } from "@/components/motion";
```

- [ ] **Step 2: Remove the manual IntersectionObserver**

Delete the `howRef` declaration and the entire `useEffect` that sets up the `IntersectionObserver` (lines 77 and 106-120 in the current file). The `howRef` is used on the How It Works section — we'll replace it with `<Reveal>`.

Remove:
```tsx
const howRef = useRef<HTMLDivElement>(null);
```

Remove the entire `useEffect` block:
```tsx
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
```

Also remove the `useRef` import if it's no longer used by anything else. Check: `useRef` is still used by other code in the file (no — `useRef` is only used for `howRef`). However, `useCallback`, `useEffect`, `useState` are still used. Remove `useRef` from the import.

Update the import line from:
```tsx
import { useCallback, useEffect, useRef, useState } from "react";
```
to:
```tsx
import { useCallback, useEffect, useState } from "react";
```

- [ ] **Step 3: Update the Hero section**

Replace the hero `<section>` content. The left side text currently has a single `animate-fade-up` div. Replace with individual `<Reveal>` wrappers for staggered entrance:

Replace the entire hero section (from `{/* Hero — text left, animated demo right */}` to the closing `</section>`) with:

```tsx
{/* Hero — text left, animated demo right */}
<section className="pt-28 pb-20 px-6">
  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
    {/* Left — copy */}
    <div>
      <Reveal delay={0}>
        <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-[1.15] tracking-tight text-balance mb-5">
          You direct the story.
          <br />
          <span className="text-primary">AI writes it.</span>
        </h1>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="text-muted-foreground text-lg leading-relaxed text-pretty max-w-lg mb-8">
          Shape plots, steer characters, and craft entire novels — without writing a single paragraph yourself.
        </p>
      </Reveal>
      <Reveal delay={0.3}>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150" onClick={() => navigate("/story/new")}>
            Start your story <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
          <span className="text-xs text-muted-foreground">Free · No credit card needed</span>
        </div>
      </Reveal>
    </div>

    {/* Right — animated story demo */}
    <Reveal delay={0.2}>
      <div className="relative min-h-[420px]">
        {/* Fade edges */}
        <div className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
          style={{
            background: `
              linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 8%, transparent 85%, hsl(var(--background)) 100%),
              linear-gradient(to right, hsl(var(--background)) 0%, transparent 5%, transparent 95%, hsl(var(--background)) 100%)
            `,
          }}
        />

        {/* Editor chrome — fades out when graph phase starts */}
        <div className={`absolute inset-0 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 md:p-8 overflow-hidden transition-opacity duration-700 ${graphPhaseStarted ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
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

        {/* Graph overlay — fades in when graph phase starts, z-[5] so vignette overlay softens its edges */}
        {showChoices && (
          <div className={`absolute inset-0 z-[5] transition-opacity duration-700 ${graphPhaseStarted ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <HeroGraphSequence triggered={graphPhaseStarted} onComplete={handleGraphComplete} />
          </div>
        )}
      </div>
    </Reveal>
  </div>
</section>
```

- [ ] **Step 4: Update How It Works section with Reveal + StaggerGroup**

Replace the How It Works section with `<Reveal>` on the heading and `<StaggerGroup>` on the cards. Replace the section (from `{/* How it works */}` to its closing `</section>`) with:

```tsx
{/* How it works */}
<section className="py-20 px-6 bg-card/40">
  <div className="max-w-4xl mx-auto">
    <Reveal>
      <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground text-center mb-3">
        How it works
      </h2>
      <p className="text-muted-foreground text-center mb-14 max-w-md mx-auto">
        Three steps. No writing experience needed.
      </p>
    </Reveal>

    <StaggerGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-10">
      {HOW_IT_WORKS.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={i} className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-5">
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">
              Step {i + 1}
            </div>
            <h3 className="font-medium text-foreground mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
              {step.description}
            </p>
          </div>
        );
      })}
    </StaggerGroup>
  </div>
</section>
```

Note: removed `ref={howRef}` and `opacity-0` class (no longer needed — Reveal handles it). Removed `border-t border-border/50` and added `bg-card/40` for the alternating section pattern.

- [ ] **Step 5: Add gradient divider between Hero and How It Works**

Between the hero `</section>` and the How It Works `<section>`, add:

```tsx
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card) / 0.4))" }} />
```

- [ ] **Step 6: Update Features Strip with StaggerGroup and card hover**

Replace the Features Strip section with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--card) / 0.4), hsl(var(--background)))" }} />

{/* Features highlight strip */}
<section className="py-16 px-6">
  <div className="max-w-4xl mx-auto">
    <StaggerGroup stagger={0.1} className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            className="p-4 rounded-xl border border-border bg-card/60 hover:bg-card text-left group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary mb-3 group-hover:bg-primary/10 transition-colors">
              <Icon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-[5deg]" />
            </div>
            <div className="text-sm font-medium text-foreground mb-0.5">{f.title}</div>
            <div className="text-xs text-muted-foreground">{f.desc}</div>
          </button>
        );
      })}
    </StaggerGroup>
  </div>
</section>
```

Note: removed `border-t border-border/50` from the section (gradient divider handles it). Added card hover classes and icon rotate on hover.

- [ ] **Step 7: Update CTA section with Reveal**

Replace the CTA section with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card) / 0.4))" }} />

{/* CTA */}
<section className="py-20 px-6 bg-card/40">
  <Reveal>
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mb-4">
        Ready to write your story?
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Free to start. No credit card needed.
      </p>
      <div className="flex items-center justify-center">
        <Button size="lg" className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150" onClick={() => navigate("/story/new")}>
          Try it free <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  </Reveal>
</section>
```

- [ ] **Step 8: Verify build and tests**

Run: `npm run build && npm run test`
Expected: Build succeeds. All tests pass (Framer Motion components render children normally in jsdom).

- [ ] **Step 9: Commit**

```bash
git add src/pages/Index.tsx
git commit -m "feat: add scroll animations and section transitions to landing page"
```

---

### Task 9: Apply animations to Genre Landing pages (`GenreLanding.tsx`)

**Files:**
- Modify: `src/pages/GenreLanding.tsx`

Changes:
1. Hero: genre icon scale-in, staggered heading/description/CTA
2. Demo section: `<Reveal>` wrapper
3. Conventions: `<Reveal>` with fade-only on body text
4. Story starters: `<StaggerGroup>` with card hover
5. Final CTA: `<Reveal>`
6. Section backgrounds: alternating bg-background / bg-card/40 with gradient dividers

- [ ] **Step 1: Add imports**

At the top of `src/pages/GenreLanding.tsx`, add:

```tsx
import { Reveal, StaggerGroup } from "@/components/motion";
```

- [ ] **Step 2: Update the Hero section**

Replace the hero `<section>` (from `{/* Hero — heading + CTA up top */}` to its `</section>`) with:

```tsx
{/* Hero — heading + CTA up top */}
<section className="pt-28 pb-20 px-6">
  <div className="max-w-3xl mx-auto text-center">
    <Reveal delay={0}>
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6">
        <Icon className="w-7 h-7" />
      </div>
    </Reveal>
    <Reveal delay={0.15}>
      <h1 className="font-story text-4xl md:text-5xl font-semibold text-foreground leading-tight tracking-tight text-balance mb-5">
        {data.heroHeading}
      </h1>
    </Reveal>
    <Reveal delay={0.3}>
      <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto mb-8">
        {data.heroDescription}
      </p>
    </Reveal>
    <Reveal delay={0.4}>
      <div className="flex items-center justify-center gap-4">
        <Button size="lg" className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150" onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}>
          Start writing <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
        <a
          href="#demo"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
        >
          See it in action <ChevronDown className="w-3.5 h-3.5" />
        </a>
      </div>
    </Reveal>
  </div>
</section>
```

- [ ] **Step 3: Update Demo section**

Replace the demo `<section>` with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card) / 0.4))" }} />

{/* Interactive demo */}
<section id="demo" className="py-16 px-6 bg-card/40 scroll-mt-20">
  <div className="max-w-5xl mx-auto">
    <Reveal>
      <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-3">
        Try the experience
      </h2>
      <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
        Make choices in the editor, then switch to the tree to see your story's shape.
      </p>
    </Reveal>
    <Reveal>
      <DemoStoryViewer
        nodes={DEMO_TREES[data.demoTreeKey].nodes}
        title={DEMO_TREES[data.demoTreeKey].title}
      />
    </Reveal>
  </div>
</section>
```

- [ ] **Step 4: Update Conventions section**

Replace the conventions `<section>` with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--card) / 0.4), hsl(var(--background)))" }} />

{/* Genre conventions */}
<section className="py-16 px-6">
  <div className="max-w-3xl mx-auto text-center">
    <Reveal>
      <h2 className="font-story text-2xl font-semibold text-foreground mb-4">
        Built for {data.label.toLowerCase()}
      </h2>
    </Reveal>
    <Reveal duration={0.4}>
      <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
        {data.conventions}
      </p>
    </Reveal>
  </div>
</section>
```

- [ ] **Step 5: Update Story Starters section with StaggerGroup and card hover**

Replace the story starters `<section>` with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--card) / 0.4))" }} />

{/* Story starters — inspiration before the final push */}
<section className="py-16 px-6 bg-card/40">
  <div className="max-w-4xl mx-auto">
    <Reveal>
      <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-3">
        Story starters
      </h2>
      <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
        Pick a premise or bring your own — the AI takes it from there.
      </p>
    </Reveal>
    <StaggerGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.hooks.map((hook, i) => (
        <button
          key={i}
          onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}
          className="p-5 rounded-2xl border border-border bg-card hover:bg-card/80 hover:border-primary/30 text-left group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="font-story text-sm leading-relaxed text-foreground/80 group-hover:text-foreground/90 transition-colors">{hook}</p>
        </button>
      ))}
    </StaggerGroup>
  </div>
</section>
```

- [ ] **Step 6: Update Final CTA**

Replace the final CTA `<section>` with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--card) / 0.4), hsl(var(--background)))" }} />

{/* Final CTA */}
<section className="py-20 px-6">
  <Reveal>
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="font-story text-2xl md:text-3xl font-semibold text-foreground mb-4">
        Ready to write?
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Free to start. No credit card needed.
      </p>
      <Button size="lg" className="hover:scale-[1.02] active:scale-[0.98] transition-transform duration-150" onClick={() => navigate(user ? `/story/new?mode=genre&genre=${genre}` : "/auth")}>
        Begin your {data.label.toLowerCase()} story <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  </Reveal>
</section>
```

- [ ] **Step 7: Remove old border-t classes**

All `border-t border-border/50` on sections should have been removed in the replacements above (gradient dividers replace them). Verify no old border-t remains.

- [ ] **Step 8: Verify build and tests**

Run: `npm run build && npm run test`
Expected: Build succeeds. All tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/pages/GenreLanding.tsx
git commit -m "feat: add scroll animations and section transitions to genre landing pages"
```

---

### Task 10: Apply animations to Features page (`Features.tsx`)

**Files:**
- Modify: `src/pages/Features.tsx`

Changes:
1. Hero: staggered heading/subtext
2. Demo: `<Reveal>` wrapper
3. Feature grid: `<StaggerGroup>` with card hover + icon rotate
4. How It Works: `<StaggerGroup>` with step number emphasis
5. CTA: `<Reveal>` wrapper

- [ ] **Step 1: Add imports**

At the top of `src/pages/Features.tsx`, add:

```tsx
import { Reveal, StaggerGroup } from "@/components/motion";
```

- [ ] **Step 2: Update Hero section**

Replace the hero `<section>` with:

```tsx
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
```

- [ ] **Step 3: Update Demo section**

Replace the demo `<section>` with:

```tsx
{/* Gradient divider */}
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
```

- [ ] **Step 4: Update Feature Grid with StaggerGroup, card hover, and icon rotate**

Replace the feature grid `<section>` with:

```tsx
{/* Gradient divider */}
<div className="h-16" style={{ background: "linear-gradient(to bottom, hsl(var(--card) / 0.4), hsl(var(--background)))" }} />

{/* Features grid */}
<section className="py-16 px-6">
  <div className="max-w-5xl mx-auto">
    <StaggerGroup stagger={0.1} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        return (
          <div key={feature.title} className="p-6 rounded-2xl border border-border bg-card group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
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
```

- [ ] **Step 5: Update How It Works section**

Replace the How It Works `<section>` with:

```tsx
{/* Gradient divider */}
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
```

- [ ] **Step 6: Update CTA section**

Replace the CTA `<section>` with:

```tsx
{/* Gradient divider */}
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
```

- [ ] **Step 7: Verify build and tests**

Run: `npm run build && npm run test`
Expected: Build succeeds. All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Features.tsx
git commit -m "feat: add scroll animations and section transitions to features page"
```

---

### Task 11: Apply animations to Pricing page (`Pricing.tsx`)

**Files:**
- Modify: `src/pages/Pricing.tsx`

Changes:
1. Heading: `<Reveal>` on load
2. Pricing cards: `<StaggerGroup>` with card hover
3. FAQ items: `<StaggerGroup stagger={0.05}>` for sequential fade-in

- [ ] **Step 1: Add imports**

At the top of `src/pages/Pricing.tsx`, add:

```tsx
import { Reveal, StaggerGroup } from "@/components/motion";
```

- [ ] **Step 2: Update heading and promo banner**

Wrap the promo banner + heading block in `<Reveal>`. Find the `<main>` tag content. Replace from the `{activePromo && (` block through the closing `</div>` of the heading `<div className="text-center mb-12">`:

```tsx
<Reveal>
  {activePromo && (
    <div className="mb-8 flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/[0.04] px-5 py-2.5 mx-auto w-fit">
      <Tag className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{activePromo.label}</span>
    </div>
  )}

  <div className="text-center mb-12">
    <h1 className="font-story text-3xl font-semibold text-foreground" style={{ lineHeight: "1.1" }}>
      Choose your plan
    </h1>
    <p className="text-muted-foreground mt-3 max-w-md mx-auto">
      Start free, upgrade when you need more stories, better AI, and full creative control.
    </p>
  </div>
</Reveal>
```

- [ ] **Step 3: Wrap pricing cards in StaggerGroup with card hover**

Replace the `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">` and its contents. The outer div becomes a `<StaggerGroup>`:

```tsx
<StaggerGroup stagger={0.15} className="grid grid-cols-1 md:grid-cols-3 gap-6">
```

The closing `</div>` for the grid becomes `</StaggerGroup>`.

Also add card hover classes to each pricing card `<div>`. Find the card's className — the one starting with `` `relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${ ``. Add hover classes to the end of the template literal, before the closing backtick:

Change:
```tsx
: "border-border bg-card"
}`}
```

To:
```tsx
: "border-border bg-card"
} hover:-translate-y-0.5 hover:shadow-md`}
```

- [ ] **Step 4: Wrap FAQ section in StaggerGroup**

Replace the FAQ `<div className="max-w-2xl mx-auto divide-y divide-border">` with a StaggerGroup-based approach. Replace the FAQ section:

```tsx
{/* FAQ */}
<section className="mb-8">
  <Reveal>
    <h2 className="font-story text-2xl font-semibold text-foreground text-center mb-8">
      Frequently asked questions
    </h2>
  </Reveal>
  <StaggerGroup stagger={0.05} className="max-w-2xl mx-auto divide-y divide-border">
    {FAQ_ITEMS.map((item) => (
      <div key={item.question} className="py-5 first:pt-0 last:pb-0">
        <h3 className="font-medium text-foreground mb-1.5">{item.question}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
      </div>
    ))}
  </StaggerGroup>
</section>
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm run test`
Expected: Build succeeds. All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Pricing.tsx
git commit -m "feat: add scroll animations to pricing page"
```

---

### Task 12: Apply animations to Auth page (`Auth.tsx`)

**Files:**
- Modify: `src/pages/Auth.tsx`

Changes:
1. Card entrance: Replace Tailwind `animate-fade-up` with Framer Motion spring entrance
2. Mode transitions: Wrap login/signup/forgot/verify forms in `<AnimatePresence mode="wait">` for cross-fade
3. OTP digit boxes: stagger entrance
4. Password validation: use `motion.div` for height+opacity transitions on requirement items

- [ ] **Step 1: Add imports**

At the top of `src/pages/Auth.tsx`, add:

```tsx
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

- [ ] **Step 2: Replace card entrance animation**

Find `<div className="w-full max-w-sm animate-fade-up">` and replace with:

```tsx
<motion.div
  className="w-full max-w-sm"
  initial={{ opacity: 0, y: 16, scale: 0.96 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
>
```

Find its corresponding closing `</div>` (the one that closes the auth card container — it's the `</div>` just before the `</div>` that closes `flex-1 flex items-center`) and replace with `</motion.div>`.

- [ ] **Step 3: Add AnimatePresence for mode transitions**

Wrap the verify mode block and the email form block in `<AnimatePresence mode="wait">`. Find the `{/* Verify mode */}` comment and the content that follows.

The idea is to wrap all the conditional content (verify block, Google block, form block, footer links) in a single `<AnimatePresence>` with keyed `motion.div` wrappers.

Replace from `{/* Verify mode */}` through `{/* Footer links */}` and its closing:

```tsx
<AnimatePresence mode="wait">
  {mode === "verify" ? (
    <motion.div
      key="verify"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Verify mode content — keep existing JSX exactly as-is */}
      <div>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {!otpReady
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending code ({otpCountdown}s)</span>
            : <>Enter the 6-digit code sent to <span className="text-foreground font-medium">{email}</span></>
          }
        </p>
        <div className="flex justify-center gap-2 mb-6">
          {otpDigits.map((digit, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <input
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                role="textbox"
                maxLength={1}
                value={digit}
                disabled={!otpReady || otpLoading}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className={`w-10 h-12 text-center text-lg border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all ${!otpReady ? "opacity-30 cursor-not-allowed" : ""}`}
              />
            </motion.div>
          ))}
        </div>
        {otpLoading && (
          <div className="flex justify-center mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
          </button>
          <div>
            <button
              onClick={() => { setMode("signup"); setOtpDigits(["", "", "", "", "", ""]); setOtpReady(false); setOtpCountdown(0); }}
              className="text-primary hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  ) : (
    <motion.div
      key={mode}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {/* Google */}
      {mode !== "forgot" && (
        <>
          <Button variant="outline" className="w-full mb-4" onClick={handleGoogleAuth}>
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
          </div>
        </>
      )}

      {/* Email form */}
      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
        </div>
        {mode !== "forgot" && (
          <>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "signup" && password.length > 0 && (
                <motion.div
                  className="mt-2.5 space-y-1.5"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.2 }}
                >
                  {[
                    { met: password.length >= 8, label: "At least 8 characters" },
                    { met: /[A-Z]/.test(password), label: "Uppercase letter" },
                    { met: /[a-z]/.test(password), label: "Lowercase letter" },
                    { met: /[0-9]/.test(password), label: "Number" },
                  ].map(({ met, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <motion.div
                        className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-200 ${met ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/10 text-destructive"}`}
                        animate={met ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </motion.div>
                      <span className={`text-xs transition-colors duration-200 ${met ? "text-emerald-500" : "text-muted-foreground"}`}>{label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" className={confirmPassword.length > 0 ? (password === confirmPassword ? "border-emerald-500/50 focus-visible:ring-emerald-500/30" : "border-destructive/50 focus-visible:ring-destructive/30") : ""} />
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-200 ${password === confirmPassword ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                      {password === confirmPassword ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </div>
                    <span className={`text-xs transition-colors duration-200 ${password === confirmPassword ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      {/* Footer links */}
      <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
        {mode === "login" && (
          <>
            <button onClick={() => setMode("forgot")} className="hover:text-foreground transition-colors block mx-auto">Forgot password?</button>
            <p>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="text-primary hover:underline">Sign up</button></p>
          </>
        )}
        {mode === "signup" && (
          <p>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary hover:underline">Sign in</button></p>
        )}
        {mode === "forgot" && (
          <button onClick={() => setMode("login")} className="text-primary hover:underline">Back to sign in</button>
        )}
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

Note: The `{mode !== "verify" && <form>}` and `{mode !== "verify" && (...footer...)}` conditionals are folded into the AnimatePresence — the verify branch shows its own content, the else branch shows Google+form+footer.

- [ ] **Step 4: Remove the old `animate-fade-up` from verify block**

The old verify block had `<div className="animate-fade-up">`. This is now handled by AnimatePresence. Make sure the verify content inside the `motion.div key="verify"` does NOT have `animate-fade-up` on it.

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npm run test`
Expected: Build succeeds. All tests pass. The auth tests in `src/test/auth-otp.test.tsx` should still pass — AnimatePresence renders children normally in jsdom. If any test fails due to Framer Motion wrapping, check that text queries still find their targets (Framer Motion inserts `<div>` wrappers which don't affect text matching).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Auth.tsx
git commit -m "feat: add AnimatePresence mode transitions and Framer card entrance to auth page"
```

---

### Task 13: Final verification — build, test, lint

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No new lint errors. Fix any that appear.

- [ ] **Step 2: Run full test suite**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds. Check bundle size — Framer Motion should add ~32KB gzip.

- [ ] **Step 4: Visual smoke test**

Run: `vercel dev --listen 8080`
Then manually check each page in the browser:
- `/` — hero stagger, scroll reveals, gradient dividers, card hover
- `/genres/fantasy` — hero stagger, demo reveal, story starter hover
- `/features` — feature grid stagger, icon rotate on hover
- `/pricing` — card stagger, FAQ fade-in
- `/auth` — card entrance spring, mode switch cross-fade
- Navbar: transparent at top, solid on scroll, hides on scroll down, shows on scroll up
- Mobile viewport: stagger disabled, reduced translate distances
- `prefers-reduced-motion`: all animations disabled

- [ ] **Step 5: Final commit (if any lint/test fixes were needed)**

```bash
git add -A
git commit -m "fix: address lint and test issues from animation overhaul"
```

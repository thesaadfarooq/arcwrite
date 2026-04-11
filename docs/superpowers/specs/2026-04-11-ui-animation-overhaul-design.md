# UI Animation Overhaul — Design Spec

**Goal:** Add smooth scroll-triggered animations, section transitions, and micro-interactions to all public-facing pages using Framer Motion, elevating the perceived quality to match modern SaaS standards (blaze.ai reference) while preserving Arcwrite's dark literary identity.

**Scope:** Landing, Genre, Features, Pricing, Auth pages. Dashboard is untouched. No new colors, fonts, or layout restructuring.

**Library:** Framer Motion (~32KB gzip). Replaces manual IntersectionObserver patterns and Tailwind keyframe animations on marketing pages.

---

## 1. Motion Component Library (`src/components/motion/`)

### 1.1 `Reveal.tsx`

A scroll-triggered reveal wrapper using Framer Motion's `whileInView`.

**Props:**
- `direction`: `"up" | "down" | "left" | "right"` (default `"up"`)
- `delay`: number in seconds (default `0`)
- `duration`: number in seconds (default `0.5`)
- `className`: passthrough
- `children`: ReactNode

**Behavior:**
- Initial state: `opacity: 0`, translated 20px in the given direction (12px on mobile via CSS media query or JS check)
- When 20% visible in viewport: animate to `opacity: 1, translate: 0` with the specified duration and delay
- `once: true` — only animates on first appearance
- Respects `prefers-reduced-motion`: if enabled, renders children immediately with no animation

### 1.2 `StaggerGroup.tsx`

Wraps multiple `Reveal` children and assigns incremental delays.

**Props:**
- `stagger`: number in seconds between each child (default `0.1`)
- `direction`: passed to each child Reveal (default `"up"`)
- `className`: passthrough for the container div
- `children`: ReactNode

**Behavior:**
- Iterates over `React.Children`, wrapping each in `<Reveal delay={index * stagger}>` 
- On mobile (below `md` breakpoint): stagger is set to `0` — all children appear together to avoid slow sequential loading on small screens
- Container div uses `whileInView` with `once: true` at `viewport: { amount: 0.1 }` so the group triggers as one unit

### 1.3 `useNavbarScroll.ts`

Custom hook for navbar scroll behavior.

**Returns:** `{ isScrolled: boolean, isVisible: boolean }`

**Behavior:**
- `isScrolled`: `true` when `scrollY > 50` — used to toggle transparent → solid navbar background
- `isVisible`: `true` when user is scrolling up or at top of page — used to show/hide navbar
- Uses `requestAnimationFrame` for throttling (no jank)
- Delta threshold of 5px before toggling visibility (prevents micro-scroll jitter)
- Always visible when `scrollY < 100` regardless of direction

## 2. Navbar Updates (`src/components/Navbar.tsx`)

**Current:** Fixed position, always visible, constant `bg-background/80 backdrop-blur-sm border-b border-border/50`.

**New behavior:**
- At page top: `bg-transparent`, no border, no blur
- After 50px scroll: transitions to `bg-background/80 backdrop-blur-sm border-b border-border/50` over 300ms
- On scroll down (past 100px): slides up with `translateY(-100%)` over 300ms
- On scroll up: slides back down immediately
- All transitions use CSS transitions (not Framer Motion) for performance — navbar transforms are GPU-composited
- Mobile: identical behavior, hamburger menu unchanged

## 3. Section Transitions (all pages)

**Current:** All sections have `bg-background` with hard edges between them.

**New:** Alternate sections between `bg-background` and `bg-card/40` (a slightly lighter band using the existing card color at 40% opacity). Between each pair, a 60px tall gradient div smoothly blends the two backgrounds.

**Implementation:** A `<SectionDivider />` component (or inline div) placed between sections:
```
background: linear-gradient(to bottom, var(--from-bg), var(--to-bg))
```

Uses existing Tailwind color tokens — no new CSS custom properties needed. Just `bg-background` and `bg-card/40`.

## 4. Page-Specific Animation Choreography

### 4.1 Landing Page (`Index.tsx`)

**Hero (on load, not scroll-triggered):**
- Left side text: staggered `<Reveal>` — tagline (0ms), heading (150ms), subtext (300ms), CTA button (450ms)
- Right side demo container: `<Reveal delay={0.2}>` — slightly after heading
- Typewriter + graph sequence: unchanged (already polished)

**How It Works section:**
- Replace manual IntersectionObserver with `<Reveal>` wrapper on section heading
- 3 step cards wrapped in `<StaggerGroup stagger={0.1}>`

**Features Strip:**
- 4 feature cards wrapped in `<StaggerGroup stagger={0.1}>`
- Card hover: `translateY(-2px)` + shadow increase over 200ms

**CTA section:**
- Heading + button wrapped in `<Reveal>`

### 4.2 Genre Landing Pages (`GenreLanding.tsx`)

**Hero (on load):**
- Genre icon: scales from 0.8 to 1.0 with spring easing (200ms)
- Heading, description: staggered `<Reveal>` (0, 150, 300ms)
- CTA buttons: `<Reveal delay={0.4}>`

**Demo section:**
- DemoStoryViewer container: `<Reveal>`. Internal tree animations unchanged.

**Conventions section:**
- Heading: `<Reveal>`. Body text: `<Reveal>` with fade-in only (no translate).

**Story Starters:**
- Cards: `<StaggerGroup stagger={0.1}>` with hover lift effect

**Final CTA:**
- `<Reveal>` wrapper

**Section backgrounds:** Alternating pattern with gradient dividers, same as landing.

### 4.3 Features Page (`Features.tsx`)

**Hero:** Same stagger pattern as landing hero.

**Demo:** `<Reveal>` container. Internals unchanged.

**Feature Grid:** `<StaggerGroup stagger={0.1}>` on the 3-column card grid. Icons do `rotate(5deg)` on card hover (300ms ease).

**How It Works:** 3 steps in `<StaggerGroup>`. Step numbers scale in with spring easing.

**CTA:** `<Reveal>` wrapper.

### 4.4 Pricing Page (`Pricing.tsx`)

**Heading:** `<Reveal>` on load.

**Pricing Cards:** `<StaggerGroup stagger={0.15}>`. The Popular card (Plus) has initial scale of 0.95 vs 0.96 for others — slightly more dramatic entrance. All cards get hover lift + shadow effect.

**Feature checklist:** Check marks fade in with `<StaggerGroup stagger={0.05}>` on scroll.

**FAQ:** FAQ items are static (always visible, not an accordion). Wrap the list in `<StaggerGroup stagger={0.05}>` so items fade in sequentially on scroll.

### 4.5 Auth Page (`Auth.tsx`)

**Card entrance:** Framer Motion `initial={{ opacity: 0, y: 16, scale: 0.96 }}` → `animate={{ opacity: 1, y: 0, scale: 1 }}` with spring easing (400ms). Replaces Tailwind `animate-fade-up`.

**Mode transitions:** Wrap login/signup/forgot/verify forms in `<AnimatePresence mode="wait">`. Outgoing form fades out + slides left, incoming fades in + slides from right. 250ms duration.

**OTP digit boxes:** `<StaggerGroup stagger={0.05} direction="up">` on the 6 inputs. Disabled state (countdown) dims inputs to opacity 30% as currently implemented.

**Password validation:** Requirement list items use `<motion.div>` with `animate` for height + opacity transitions. Check icon scales in with spring when requirement met.

## 5. Card & Button Micro-interactions

### Cards (feature cards, story starters, pricing cards)

- Hover: `translateY(-2px)`, `box-shadow` increases, `border-color` shifts to `primary/30`
- Transition: 200ms ease-out
- Touch devices: no hover transform (use `@media (hover: hover)`)
- Implemented via Tailwind classes + CSS, not Framer Motion (hover animations don't need JS)

### Primary Buttons

- Hover: `scale(1.02)` over 150ms
- Active/pressed: `scale(0.98)` over 100ms
- Implemented via Framer Motion `whileHover` and `whileTap` on a wrapped button component, or via CSS `active:scale-[0.98] hover:scale-[1.02]` if simpler

### Secondary/Outline Buttons

- Hover: color shift only (existing behavior). No scale transform.

### Nav Links

- Underline slides in from left on hover: pseudo-element `::after` with `width: 0 → 100%` transition (200ms)

### Feature Card Icons

- On parent card hover: `rotate(5deg)` over 300ms ease
- CSS only: `.group:hover .icon { transform: rotate(5deg) }`

## 6. Mobile Considerations

- **Stagger disabled on mobile:** `<StaggerGroup>` sets stagger to 0 below `md` breakpoint — all children appear simultaneously
- **Reduced translate distances:** `<Reveal>` uses 12px translateY on mobile vs 20px on desktop
- **Scroll trigger threshold:** Lowered from 20% to 10% on mobile so animations fire sooner (less scrolling needed)
- **No hover effects on touch:** Card lift and icon rotate gated behind `@media (hover: hover)`
- **prefers-reduced-motion:** All motion components check this media query and render static content immediately if enabled
- **No parallax or heavy transforms:** Everything is simple opacity + translate — performant on low-end devices

## 7. File Structure

```
src/components/motion/
  Reveal.tsx          (~40 lines)
  StaggerGroup.tsx    (~35 lines)
  useNavbarScroll.ts  (~40 lines)
  index.ts            (barrel export)
```

Pages modified:
- `src/components/Navbar.tsx` — add scroll behavior
- `src/pages/Index.tsx` — wrap sections in Reveal/StaggerGroup
- `src/pages/GenreLanding.tsx` — wrap sections
- `src/pages/Features.tsx` — wrap sections
- `src/pages/Pricing.tsx` — wrap sections, upgrade FAQ accordion
- `src/pages/Auth.tsx` — AnimatePresence for mode transitions

Estimated per-page change: 20-40 lines added (mostly wrapping existing JSX).

## 8. Testing

- Existing tests should not break — Reveal/StaggerGroup are visual wrappers that don't change DOM structure or behavior
- Framer Motion components render their children normally in jsdom (animations don't run)
- `useNavbarScroll` hook can be tested by mocking `window.scrollY` and dispatching scroll events
- No new test files needed unless a component's testable behavior changes

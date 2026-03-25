# SEO Foundation Phase — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Problem

Arcwrite's public surface is tiny (landing page, pricing, auth) and all pages share the same static meta tags from `index.html`. There are no per-route titles, descriptions, or canonical URLs. Utility pages like `/auth` are in the sitemap. There's no footer with internal links, no dedicated feature or genre pages to capture search intent, and the pricing page has no content beyond the tier cards.

## Goal

Expand Arcwrite's indexable public footprint with per-route metadata, new content pages, internal linking, and structured data — all within the existing Vite SPA architecture using client-side meta tag management.

## Decisions

- **Metadata approach:** `react-helmet-async` for client-side per-route meta tags. No SSR or pre-rendering — Google renders JS fine, and social crawlers already hit the OG serverless function for shared stories. Static tags in `index.html` remain as fallbacks.
- **No SSG/SSR:** Not worth the architecture change at this stage. Revisit only if Search Console shows indexing issues.
- **Genre pages:** Single component with a data map, not 5 separate files.
- **Content:** Real marketing copy, not placeholders.
- **Out of scope:** Examples page, how-it-works page, use-case pages, comparison pages, blog, SSR/pre-rendering.

## Components

### 1. SEO Component (`src/components/SEO.tsx`)

A reusable wrapper around `react-helmet-async`'s `<Helmet>`. Every public page uses this.

**Props:**
- `title` (required) — Page title, e.g. `"Features — Arcwrite"`
- `description` (optional) — Meta description, 150-160 chars. Omit for `noindex` pages.
- `canonical` (optional) — Path relative to base URL, e.g. `"/features"`. Omit for `noindex` pages.
- `noindex` (optional, boolean) — Adds `<meta name="robots" content="noindex, nofollow" />`. When true, `description` and `canonical` are not required (the page won't be indexed).
- `breadcrumbs` (optional) — Array of `{ name, url }` for `BreadcrumbList` JSON-LD
- `faqItems` (optional) — Array of `{ question, answer }` for `FAQPage` JSON-LD

**Renders:**
- `<title>`
- `<meta name="description">`
- `<link rel="canonical">` (full URL: `https://arcwrite.app{canonical}`)
- `og:title`, `og:description`, `og:url`, `og:type` (website), `og:site_name` (Arcwrite), `og:image` (static `og-image.png`)
- `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`
- `<meta name="robots">` when `noindex` is true
- `BreadcrumbList` JSON-LD when `breadcrumbs` is provided
- `FAQPage` JSON-LD when `faqItems` is provided

**Setup:** Wrap the app in `<HelmetProvider>` in `App.tsx`, placed as the outermost provider (before `QueryClientProvider`).

### 2. Features Page (`src/pages/Features.tsx`)

**Route:** `/features`

**Target keywords:** "AI story generator features", "interactive fiction writing tool", "branching narrative creator"

**Sections:**
1. **Hero** — Heading: "Everything you need to write interactive fiction". Subtitle describing Arcwrite's value prop.
2. **Core features grid** — 6 feature cards in a responsive grid:
   - AI-powered prose generation
   - Branching choices (4 types: safe, risky, emotional, chaotic)
   - Genre & tone customization (6 genres, multiple tones)
   - Story tree visualization
   - PDF export
   - Public sharing links
3. **How it works** — 3-step flow (expanded from landing page): describe your idea → make choices → AI writes the prose.
4. **CTA** — "Start writing for free" button linking to `/story/new`.

**Design:** Same nav bar as other pages (logo, theme toggle, auth button). New shared footer. Serif headings (`font-story`), standard color tokens.

### 3. Genre Landing Pages (`src/pages/GenreLanding.tsx`)

**Route:** `/genres/:genre`

**Valid genres:** `fantasy`, `scifi`, `mystery`, `romance`, `horror`, `thriller`

**Target keywords:** "[genre] AI story generator", "AI [genre] story writer", "create [genre] interactive fiction"

**Architecture:** One component reads `:genre` from the URL param and looks up content from a `GENRE_DATA` map. Invalid genre slugs render the 404 page (or redirect to `/features`).

**Genre data map keys:** `title`, `description`, `icon` (reuse Lucide icons from StoryNew), `metaDescription`, `hooks` (3-4 story premise examples), `conventions` (how AI adapts to the genre).

**Page sections per genre:**
1. **Hero** — Genre-specific heading (e.g., "Write your own fantasy adventure"), genre icon, brief description of the genre in Arcwrite's context.
2. **What you can create** — 3-4 genre-specific story premise hooks displayed as cards. E.g., for fantasy: "A young mage discovers forbidden magic in a crumbling library".
3. **How Arcwrite handles [genre]** — Brief explanation of how the AI adapts to genre conventions (tone, tropes, pacing).
4. **CTA** — "Start a [genre] story" button → links to `/story/new?mode=genre&genre={genreId}`. Requires a minor change to `StoryNew.tsx` to read the `genre` query param and pre-select it.

### 4. Pricing Page Enrichment

**File:** `src/pages/Pricing.tsx` (modify existing)

**No changes** to the existing tier cards, Stripe integration, or subscription logic. Purely additive content sections below the tier grid.

**New sections:**

1. **"What's included in every plan"** — Bulleted list of universal features: AI generation, branching choices, story tree visualization, genre & tone selection.

2. **"Who each plan is for"** — Three short paragraphs:
   - Free: Trying out interactive fiction, writing a short story
   - Plus: Regular writers who want longer stories and PDF export
   - Pro: Power users who want unlimited creation and public sharing

3. **FAQ section** — 5-6 visible Q&A pairs:
   - "Can I try Arcwrite for free?"
   - "What happens when I hit my story limit?"
   - "Can I cancel anytime?"
   - "What AI models does Arcwrite use?"
   - "Can I export my stories?"
   - "What are public sharing links?"

**Structured data:** `FAQPage` JSON-LD generated from the same data array that renders the FAQ, passed via the `<SEO>` component's `faqItems` prop.

### 5. Shared Footer (`src/components/Footer.tsx`)

Replaces the minimal landing page footer. Used on all public pages: landing, features, genres, pricing. NOT on auth, reset-password, dashboard, or story editor pages.

**Layout:**
- **Top row** — Three columns:
  - Brand: Logo + "Stories you direct, AI delivers."
  - Pages: Features, Pricing (internal `<Link>` elements)
  - Genres: Fantasy, Sci-Fi, Mystery, Romance, Horror, Thriller (links to `/genres/*`)
- **Bottom row** — Copyright line

Uses `react-router-dom` `<Link>` for all internal navigation.

### 6. Per-Route Metadata

Every public page gets its own `<SEO>` block:

| Route | Title | Description (truncated) | Canonical |
|-------|-------|------------------------|-----------|
| `/` | `Arcwrite — AI Story Generator \| Interactive Fiction` | `Create branching choose-your-own-adventure stories...` | `/` |
| `/features` | `Features — Arcwrite` | `Explore Arcwrite's AI story generation features...` | `/features` |
| `/pricing` | `Pricing & Plans — Arcwrite` | `Choose the right Arcwrite plan...` | `/pricing` |
| `/genres/fantasy` | `Fantasy AI Story Generator — Arcwrite` | `Create branching fantasy adventures...` | `/genres/fantasy` |
| `/genres/scifi` | `Sci-Fi AI Story Generator — Arcwrite` | `Build futuristic sci-fi narratives...` | `/genres/scifi` |
| `/genres/mystery` | `Mystery AI Story Generator — Arcwrite` | `Craft detective stories and puzzles...` | `/genres/mystery` |
| `/genres/romance` | `Romance AI Story Generator — Arcwrite` | `Write love stories with meaningful choices...` | `/genres/romance` |
| `/genres/horror` | `Horror AI Story Generator — Arcwrite` | `Create terrifying horror stories...` | `/genres/horror` |
| `/genres/thriller` | `Thriller AI Story Generator — Arcwrite` | `Write high-stakes thriller stories...` | `/genres/thriller` |
| `/auth` | `Sign In — Arcwrite` | (noindex) | — |
| `/reset-password` | `Reset Password — Arcwrite` | (noindex) | — |
| `*` (404) | `Page Not Found — Arcwrite` | (noindex) | — |

### 7. Sitemap Update

Replace `public/sitemap.xml`:

**Include:**
- `/` — priority 1.0, weekly
- `/features` — priority 0.9, monthly
- `/pricing` — priority 0.8, monthly
- `/genres/fantasy` — priority 0.7, monthly
- `/genres/scifi` — priority 0.7, monthly
- `/genres/mystery` — priority 0.7, monthly
- `/genres/romance` — priority 0.7, monthly
- `/genres/horror` — priority 0.7, monthly
- `/genres/thriller` — priority 0.7, monthly

**Remove:** `/auth`

Static XML file. No dynamic generation needed for 9 URLs.

### 8. Structured Data

- **`BreadcrumbList`** on genre pages: `Home → Genres → [Genre Name]`. Passed via `<SEO breadcrumbs={[...]} />`.
- **`FAQPage`** on pricing page: Generated from the FAQ data array. Passed via `<SEO faqItems={[...]} />`.
- **Existing `WebApplication`** in `index.html`: No changes.

### 9. `noindex` on Utility Routes

- `/auth` — `<SEO noindex title="Sign In — Arcwrite" />`
- `/reset-password` — `<SEO noindex title="Reset Password — Arcwrite" />`

These pages get a title for browser tab UX but are excluded from search indexing.

### 10. Shared Story Route (`/s/:token`)

No SEO changes needed. Social crawler OG tags are already handled by `api/og-shared-story.ts`. These pages are user-generated and not in the sitemap — they get organic reach through social sharing, not search indexing.

### 11. `index.html` Cleanup

Remove the static `<link rel="canonical" href="https://arcwrite.app/">` from `index.html`. With `react-helmet-async`, each page sets its own canonical via the `<SEO>` component. The static one would conflict (Helmet overrides it, but cleaner to remove).

### 12. robots.txt

No changes. Current config is correct:
```
User-agent: *
Allow: /
Sitemap: https://arcwrite.app/sitemap.xml
```

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `react-helmet-async` dependency |
| `src/App.tsx` | Wrap app in `<HelmetProvider>`, add `/features` and `/genres/:genre` routes |
| `src/components/SEO.tsx` | New reusable metadata component |
| `src/components/Footer.tsx` | New shared footer component |
| `src/pages/Features.tsx` | New features page |
| `src/pages/GenreLanding.tsx` | New genre landing page (data-driven) |
| `src/pages/Index.tsx` | Add `<SEO>`, replace footer with shared `<Footer>` |
| `src/pages/Pricing.tsx` | Add `<SEO>`, FAQ section, content sections, shared `<Footer>` |
| `src/pages/Auth.tsx` | Add `<SEO noindex>` |
| `src/pages/ResetPassword.tsx` | Add `<SEO noindex>` |
| `src/pages/NotFound.tsx` | Add `<SEO noindex>` |
| `src/pages/StoryNew.tsx` | Read `genre` query param to pre-select genre from genre landing page CTAs |
| `index.html` | Remove static `<link rel="canonical">` (now handled per-route by `<SEO>`) |
| `public/sitemap.xml` | Updated with new pages, auth removed |

## Out of Scope

- Examples page
- How-it-works standalone page
- Use-case pages (`/use-cases/*`)
- Comparison pages (`/compare/*`)
- Blog or content marketing
- SSR / pre-rendering / SSG
- Dynamic sitemap generation
- Social media links in footer
- Per-story OG image generation (already handled by `api/og-shared-story.ts` for shared stories)

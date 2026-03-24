# Arcwrite: Expansion & SEO Plan

Created: 2026-03-24

## Evaluation Metrics (1-5 scale)

| Metric | What it measures |
|--------|-----------------|
| **User Impact** | How much it improves the experience for existing users |
| **Growth Impact** | How much it helps acquire new users |
| **Effort** | Implementation cost (1=weeks, 5=hours) |
| **Urgency** | How much it hurts right now to not have it |

---

## DOMAIN 1: Expansion (UX Improvements)

### Tier 1 -- High Priority

| # | Idea | User | Growth | Effort | Urgency | Verdict |
|---|------|------|--------|--------|---------|---------|
| 1 | **Dynamic OG tags for shared stories** (`/s/:token`) -- story title, premise, genre-branded image on social media | 3 | 5 | 3 | 5 | Must-do. Sharing is a Pro feature but links are invisible on social. #1 organic growth lever. |
| 2 | **Analytics** -- zero tracking exists. Flying blind on visits, drop-offs, feature usage | 2 | 4 | 5 | 5 | Must-do. Can't make informed decisions without data. Vercel Analytics is one line of code. |
| 3 | **Onboarding improvements** -- no guided tour, no sample story, empty dashboard is cold | 5 | 4 | 3 | 4 | Worth it. A "Try a sample story" button or pre-loaded demo would show value instantly. |

### Tier 2 -- Medium Priority

| # | Idea | User | Growth | Effort | Urgency | Verdict |
|---|------|------|--------|--------|---------|---------|
| 4 | **Story discovery/gallery** -- public page of featured/community stories | 3 | 5 | 2 | 3 | Worth it later. Great for SEO and social proof. Needs critical mass of stories first. |
| 5 | **Undo/redo for choices** -- quick "go back one choice" instead of timeline forking | 5 | 2 | 3 | 3 | Worth it. Common frustration in CYOA apps. |
| 6 | **Story templates/prompts** -- pre-built starting points beyond "Surprise me" | 4 | 3 | 5 | 3 | Worth it. Reduces blank-page anxiety for free-tier users. |
| 7 | **Mobile experience polish** -- editor with split panels + sidebar is cramped on phones | 4 | 3 | 2 | 3 | Investigate after analytics shows mobile %. |

### Tier 3 -- Nice to Have

| # | Idea | User | Growth | Effort | Urgency | Verdict |
|---|------|------|--------|--------|---------|---------|
| 8 | **Collaborative stories** -- multiple users contributing | 4 | 4 | 1 | 1 | Not now. Huge effort, unclear demand. |
| 9 | **Story statistics** -- reading time, choice distribution, branch depth | 3 | 1 | 4 | 1 | Skip for now. |
| 10 | **Custom AI models/personas** -- configure writing style beyond tone | 3 | 2 | 3 | 1 | Skip for now. |

---

## DOMAIN 2: SEO Strategy

### Quick Wins (hours each)

| # | Action | Impact |
|---|--------|--------|
| A | **Fix OG tags in `index.html`** -- add `og:image`, `og:url`, `twitter:image`, canonical URL | High |
| B | **Add `sitemap.xml`** + reference in `robots.txt` | Medium |
| C | **JSON-LD structured data** -- `WebApplication` schema | Medium |
| D | **Improve `<title>` and meta description** -- target "AI story generator", "interactive fiction", "choose your own adventure" | Medium |

### Medium Effort (1-2 weeks)

| # | Action | Impact |
|---|--------|--------|
| E | **Dynamic OG for `/s/:token`** -- Vercel function returns story-specific meta + `@vercel/og` images | Very High |
| F | **`react-helmet-async`** for per-page titles/descriptions | Medium |
| G | **SEO landing pages** -- `/features`, `/examples`, comparison pages | High |

### Major Undertakings (weeks+)

| # | Action | Impact |
|---|--------|--------|
| H | **Pre-rendering/SSR for public pages** -- React Router v7 framework mode or edge middleware for bots | Very High |
| I | **Blog/content marketing** -- writing guides, genre content, AI writing tips | High |
| J | **Launch campaign** -- Product Hunt, Indie Hackers, HN, Reddit writing communities | High |

---

## Execution Phases

### Phase 1 (This week) -- Quick Wins
- [ ] SEO: Fix OG tags + canonical in `index.html` (A)
- [ ] SEO: Add `sitemap.xml` via vite-plugin-sitemap (B)
- [ ] SEO: Add JSON-LD structured data (C)
- [ ] SEO: Improve title and meta description keywords (D)
- [ ] Analytics: Add Vercel Analytics + Speed Insights (#2)

### Phase 2 (Next 1-2 weeks) -- Highest Impact
- [ ] Dynamic OG tags for shared stories (#1 + E)
- [ ] `@vercel/og` for branded story share images

### Phase 3 (Following weeks) -- UX + SEO Content
- [ ] Onboarding improvements (#3)
- [ ] Story templates/prompts (#6)
- [ ] Per-page meta tags with react-helmet-async (F)
- [ ] SEO landing pages (G)

### Phase 4 (When ready) -- Growth
- [ ] Story gallery (#4)
- [ ] Pre-rendering/SSR for public pages (H)
- [ ] Launch campaign (J)
- [ ] Blog/content marketing (I)

# Navigation, About/Contact Pages, and Landing Page Cleanup

**Goal:** Give Arcwrite consistent site-wide navigation, add About and Contact pages, and clean up the cluttered landing page CTAs.

**Architecture:** Extract a shared Navbar component used by all pages. Add two new static pages (About, Contact) and one API route for contact form submissions. Simplify landing page hero and CTA sections. No new libraries — uses existing shadcn/ui Sheet for mobile menu and Supabase admin client for contact storage.

**Tech stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Vitest, Testing Library, Vercel API routes (Node.js runtime for contact handler), Supabase.

---

## Section 1: Shared Navbar Component

### Current state

Every page re-implements its own navbar inline — logo, theme toggle, auth button. There are no navigation links to other pages. Users cannot navigate between Features, Pricing, or back to the home page without using the footer (which isn't present on all pages).

### Design

A new shared `Navbar` component (`src/components/Navbar.tsx`) replaces all inline navbars.

**Desktop (≥768px):**
- Left: Logo (BookOpen icon + "Arcwrite" text), clicking navigates to `/`
- Center-left: `Features` · `Pricing` · `About` · `Contact` — text links with `text-muted-foreground`, active page highlighted with `text-foreground`
- Right: Theme toggle button + Sign in (guest) or Dashboard (logged in)

**Mobile (<768px):**
- Left: Logo (links to `/`)
- Right: Theme toggle + hamburger icon (Menu from lucide-react)
- Hamburger opens a shadcn Sheet (side="right") containing:
  - Navigation links stacked vertically (Features, Pricing, About, Contact)
  - Sign in / Dashboard button at the bottom
  - Sheet closes on link click

**Styling:** Same fixed positioning and backdrop blur as current inline navs — `fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50`.

**Active link detection:** Uses `useLocation()` from react-router-dom. A link is active when the current pathname starts with the link's `to` path.

### Pages that use Navbar

All pages: Index, Features, Pricing, GenreLanding, About (new), Contact (new), Auth, ResetPassword, SharedStory, NotFound, Dashboard, StoryNew, StoryWrite.

Each page removes its inline nav and renders `<Navbar />` instead.

---

## Section 2: Footer Update

### Current state

`Footer.tsx` exists with three columns (Brand, Pages with Features/Pricing, Genres). Only some pages include it.

### Design

**Content changes:**
- Add `About` and `Contact` to the Pages links column
- Update copyright line to: "© 2026 Silvergrain. All rights reserved."

**Pages that include Footer (all public pages):**
- Index, Features, Pricing, GenreLanding, About, Contact, Auth, ResetPassword, SharedStory, NotFound

**Pages without Footer (app workspace):**
- Dashboard, StoryNew, StoryWrite

No layout wrapper component — each page that needs the footer imports and renders `<Footer />` directly, matching the existing codebase pattern.

---

## Section 3: Landing Page Cleanup

### Current state

Hero section has 6 buttons: "Start writing →", "View plans", and 4 genre quick-start buttons (Fantasy quest, Mystery case, Sci-fi mission, Romance arc). The bottom CTA section repeats the same 4 genre buttons plus "Get started →". This is cluttered and the genre buttons duplicate what's already in the footer.

### Design

**Hero section:**
- Keep: Heading, description paragraph, animated story demo
- Keep: Single primary CTA — "Start writing →"
- Remove: "View plans" button (Pricing is now in the navbar)
- Remove: All 4 genre quick-start buttons

**Bottom CTA section:**
- Keep: Heading ("Ready to write your story?"), description, single "Get started →" button
- Remove: All genre quick-start buttons

**How it works section:** Unchanged.

**Other:** The `LANDING_QUICK_STARTS` constant and its filter from `story-starters` can be removed from the import since it's no longer used on this page.

---

## Section 4: About Page

### Current state

No about page exists.

### Design

New page at `/about` (`src/pages/About.tsx`). Public route, no auth required.

**Content:**
- Heading: "About Arcwrite"
- 2-3 short paragraphs:
  1. What Arcwrite is — an AI-powered interactive fiction platform where you direct the plot and AI writes the prose
  2. What it does for users — lets anyone create branching stories without writing a single paragraph, with meaningful choices that shape the narrative
  3. Built by Silvergrain

**Layout:** Navbar at top, centered content container (`max-w-2xl mx-auto`), Footer at bottom. Same `min-h-screen bg-background` wrapper as other pages.

**SEO:** Title "About — Arcwrite", description about the platform and Silvergrain, canonical `/about`.

---

## Section 5: Contact Page

### Current state

No contact page exists.

### Design

New page at `/contact` (`src/pages/Contact.tsx`). Public route, no auth required.

**Content:**
- Heading: "Contact us"
- Support email displayed prominently: `support@arcwrite.app` as a clickable `mailto:` link
- Helper text: "We typically respond within 24 hours."
- Contact form below the email section

**Contact form fields:**
- Name — text input, required
- Email — email input, required
- Message — textarea, required
- Submit button — disabled while submitting, shows loading state

**Form behavior:**
- On submit: POST to `/api/contact` with JSON body `{ name, email, message }`
- On success (200): Clear form, show success toast ("Message sent! We'll get back to you soon.")
- On error: Show error toast ("Something went wrong. Please try emailing us directly.")
- Basic client-side validation via required attributes and email type

**Layout:** Navbar at top, centered content container (`max-w-2xl mx-auto`), Footer at bottom.

**SEO:** Title "Contact — Arcwrite", description about contacting Arcwrite support, canonical `/contact`.

---

## Section 6: Contact Form API Route

### Current state

No contact API route exists.

### Design

New Vercel API route at `api/contact.ts` (Node.js runtime).

**Request:** POST with JSON body:
```json
{
  "name": "string (required, max 200 chars)",
  "email": "string (required, valid email, max 200 chars)",
  "message": "string (required, max 5000 chars)"
}
```

**Handler logic:**
1. Validate method is POST (405 otherwise)
2. Parse and validate body — check required fields, length limits, basic email format
3. Insert into `contact_messages` table using Supabase admin client (`SUPABASE_SECRET_KEY`)
4. Return 200 on success, 400 on validation error, 500 on DB error

**Supabase table** `contact_messages`:
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, default `gen_random_uuid()` |
| `name` | text | Not null |
| `email` | text | Not null |
| `message` | text | Not null |
| `created_at` | timestamptz | Default `now()` |

**RLS policy:** Allow INSERT without auth (guests can contact). No SELECT/UPDATE/DELETE for anon role — messages are read via admin client or direct DB access only.

**Migration:** Run via SSH to the DigitalOcean Droplet as the `postgres` user, following the existing pattern in CLAUDE.md.

---

## Section 7: Route Registration

Add two new routes to `src/App.tsx`:

```tsx
<Route path="/about" element={<About />} />
<Route path="/contact" element={<Contact />} />
```

Both are public routes (no `ProtectedRoute` or `PublicOnlyRoute` wrapper).

---

## Section 8: Implementation Boundaries

### In scope
- Shared Navbar component (desktop inline links + mobile hamburger Sheet)
- All pages updated to use shared Navbar (replacing inline navs)
- Footer updated with About/Contact links and Silvergrain copyright
- Footer added to public pages that don't have it
- Landing page hero reduced to single CTA
- Landing page bottom CTA reduced to single CTA
- About page with SEO
- Contact page with email display, form, and SEO
- Contact API route with Supabase insert
- `contact_messages` Supabase table via migration
- Test coverage for Navbar, About, Contact, landing page changes

### Out of scope
- Email notifications for contact submissions
- Spam protection (CAPTCHA, rate limiting)
- Social media links
- Layout wrapper component
- Redesigning pages beyond navbar/footer/CTA changes

### Code areas

| File | Changes |
|------|---------|
| `src/components/Navbar.tsx` | **New.** Shared navbar with desktop links + mobile Sheet |
| `src/components/Footer.tsx` | Add About/Contact to Pages links, update copyright to Silvergrain |
| `src/pages/Index.tsx` | Replace inline nav with Navbar, remove genre quick-starts and "View plans" from hero and bottom CTA |
| `src/pages/About.tsx` | **New.** Minimal product-focused about page with SEO |
| `src/pages/Contact.tsx` | **New.** Contact page with email + form + SEO |
| `api/contact.ts` | **New.** Form submission handler, validates and inserts into Supabase |
| `src/App.tsx` | Add `/about` and `/contact` routes |
| `src/pages/Features.tsx` | Replace inline nav with Navbar, ensure Footer present |
| `src/pages/Pricing.tsx` | Replace inline nav with Navbar, ensure Footer present |
| `src/pages/GenreLanding.tsx` | Replace inline nav with Navbar, ensure Footer present |
| `src/pages/Auth.tsx` | Replace inline nav with Navbar, add Footer |
| `src/pages/ResetPassword.tsx` | Replace inline nav with Navbar, add Footer |
| `src/pages/SharedStory.tsx` | Replace inline nav with Navbar, add Footer |
| `src/pages/NotFound.tsx` | Replace inline nav with Navbar, add Footer |
| `src/pages/Dashboard.tsx` | Replace inline nav with Navbar (no Footer) |
| `src/pages/StoryNew.tsx` | Replace inline nav with Navbar (no Footer) |
| `src/pages/StoryWrite.tsx` | Replace inline nav with Navbar (no Footer) |

### Testing

| Area | Coverage |
|------|----------|
| Navbar | Renders logo linking to home, shows nav links, shows sign in for guests / dashboard for users, mobile menu opens Sheet |
| Footer | Renders About and Contact links, shows Silvergrain copyright |
| Landing page | Single CTA in hero, single CTA in bottom section, no genre quick-start buttons |
| About page | Renders heading, content paragraphs, mentions Silvergrain |
| Contact page | Renders email link, form fields, submits to API, shows success/error toasts |
| Contact API | Validates required fields, rejects invalid input, inserts valid submissions |

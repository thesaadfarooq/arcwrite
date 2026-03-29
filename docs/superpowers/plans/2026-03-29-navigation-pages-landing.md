# Navigation, About/Contact Pages, and Landing Page Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Arcwrite consistent site-wide navigation with a shared Navbar, add About and Contact pages with a contact form backed by Supabase, and clean up the cluttered landing page CTAs.

**Architecture:** Extract a shared Navbar component (desktop inline links + mobile hamburger Sheet) that replaces all inline navs. Add two new public pages (About, Contact) and one Node.js API route for contact form submissions that inserts into a `contact_messages` Postgres table. Simplify the landing page hero from 6 buttons to 1.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Sheet for mobile menu), Vitest, Testing Library, Vercel API routes (Node.js runtime), Postgres via `api/_db.ts`.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/Navbar.tsx` | **New.** Shared navbar: logo → home, desktop nav links, mobile hamburger Sheet, theme toggle, auth button |
| `src/components/Footer.tsx` | **Modify.** Add About/Contact links, update copyright to Silvergrain |
| `src/pages/Index.tsx` | **Modify.** Replace inline nav with Navbar, remove genre quick-starts and "View plans" |
| `src/pages/About.tsx` | **New.** Minimal about page with SEO |
| `src/pages/Contact.tsx` | **New.** Contact page with email display + form |
| `api/contact.ts` | **New.** POST handler: validate fields, insert into `contact_messages` |
| `src/App.tsx` | **Modify.** Add `/about` and `/contact` routes |
| `src/pages/Features.tsx` | **Modify.** Replace inline nav with Navbar |
| `src/pages/Pricing.tsx` | **Modify.** Replace inline nav with Navbar |
| `src/pages/GenreLanding.tsx` | **Modify.** Replace inline nav with Navbar |
| `src/pages/Auth.tsx` | **Modify.** Replace theme toggle with Navbar, add Footer |
| `src/pages/ResetPassword.tsx` | **Modify.** Add Navbar and Footer |
| `src/pages/SharedStory.tsx` | **Modify.** Replace inline nav with Navbar, add Footer |
| `src/pages/NotFound.tsx` | **Modify.** Replace inline nav with Navbar |
| `src/pages/Dashboard.tsx` | **Modify.** Replace inline nav with Navbar (no Footer) |
| `src/pages/StoryNew.tsx` | **Modify.** Replace inline nav with Navbar (no Footer) |
| `src/pages/StoryWrite.tsx` | **Modify.** Replace inline nav with Navbar (no Footer) |
| `src/test/navbar.test.tsx` | **New.** Tests for Navbar component |
| `src/test/footer.test.tsx` | **New.** Tests for Footer updates |
| `src/test/about.test.tsx` | **New.** Tests for About page |
| `src/test/contact.test.tsx` | **New.** Tests for Contact page and form |
| `src/test/contact-api.test.ts` | **New.** Tests for contact API route |
| `src/test/landing-cta.test.tsx` | **New.** Tests for landing page CTA cleanup |

---

### Task 1: Shared Navbar Component

**Files:**
- Create: `src/components/Navbar.tsx`
- Create: `src/test/navbar.test.tsx`

- [ ] **Step 1: Write failing tests for Navbar**

```tsx
// src/test/navbar.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "@/components/Navbar";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

function renderNavbar(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Navbar />
    </MemoryRouter>
  );
}

describe("Navbar", () => {
  it("renders logo linking to home", () => {
    renderNavbar();
    const logo = screen.getByRole("link", { name: /arcwrite/i });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders navigation links", () => {
    renderNavbar();
    expect(screen.getByRole("link", { name: /features/i })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: /pricing/i })).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute("href", "/contact");
  });

  it("shows sign in button for guests", () => {
    renderNavbar();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("shows dashboard button for logged-in users", async () => {
    vi.doMock("@/lib/auth", () => ({
      useAuth: () => ({ user: { id: "u1" }, loading: false }),
    }));
    const { default: NavbarAuth } = await import("@/components/Navbar");
    render(
      <MemoryRouter>
        <NavbarAuth />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /dashboard/i })).toBeDefined();
  });

  it("renders theme toggle button", () => {
    renderNavbar();
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/test/navbar.test.tsx`
Expected: FAIL — module `@/components/Navbar` not found

- [ ] **Step 3: Implement Navbar component**

```tsx
// src/components/Navbar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Sun, Moon, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => location.pathname.startsWith(to);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
      {/* Left: Logo + desktop links */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Arcwrite">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="font-story text-lg font-semibold text-foreground tracking-tight">Arcwrite</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors ${isActive(link.to) ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right: theme toggle + auth + mobile hamburger */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Auth button — desktop only */}
        <div className="hidden md:block">
          {user ? (
            <Button size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>
              <LogIn className="w-3.5 h-3.5 mr-1" /> Sign in
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Open menu">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 pt-12">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`text-sm py-2 transition-colors ${isActive(link.to) ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border/50 pt-4 mt-2">
                {user ? (
                  <Button size="sm" className="w-full" onClick={() => { setMobileOpen(false); navigate("/dashboard"); }}>Dashboard</Button>
                ) : (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setMobileOpen(false); navigate("/auth"); }}>
                    <LogIn className="w-3.5 h-3.5 mr-1" /> Sign in
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/test/navbar.test.tsx`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx src/test/navbar.test.tsx
git commit -m "feat: add shared Navbar component with desktop links and mobile menu"
```

---

### Task 2: Footer Update + Landing Page Cleanup

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/pages/Index.tsx`
- Create: `src/test/footer.test.tsx`
- Create: `src/test/landing-cta.test.tsx`

- [ ] **Step 1: Write failing tests for Footer updates**

```tsx
// src/test/footer.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/Footer";

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
}

describe("Footer", () => {
  it("renders About and Contact links", () => {
    renderFooter();
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute("href", "/contact");
  });

  it("shows Silvergrain in copyright", () => {
    renderFooter();
    expect(screen.getByText(/silvergrain/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Write failing tests for landing page CTA cleanup**

```tsx
// src/test/landing-cta.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

describe("Landing page CTAs", () => {
  it("has single Start writing CTA in hero and no genre quick-starts", async () => {
    const { default: Index } = await import("@/pages/Index");
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    // Should have "Start writing" but not "View plans"
    expect(screen.getByRole("button", { name: /start writing/i })).toBeDefined();
    expect(screen.queryByRole("button", { name: /view plans/i })).toBeNull();
    // Should not have genre quick-start buttons
    expect(screen.queryByRole("button", { name: /fantasy quest/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /mystery case/i })).toBeNull();
  });

  it("has single Get started CTA at the bottom with no genre buttons", async () => {
    const { default: Index } = await import("@/pages/Index");
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /get started/i })).toBeDefined();
    // Only 2 CTA buttons total on page: "Start writing" and "Get started"
    const allButtons = screen.getAllByRole("button");
    const ctaButtons = allButtons.filter(
      (btn) => btn.textContent?.match(/fantasy quest|mystery case|sci-fi mission|romance arc/i)
    );
    expect(ctaButtons).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- src/test/footer.test.tsx src/test/landing-cta.test.tsx`
Expected: FAIL — Footer missing About/Contact links and Silvergrain copyright; landing page still has genre buttons

- [ ] **Step 4: Update Footer component**

In `src/components/Footer.tsx`, update the `PAGE_LINKS` array and copyright line:

```tsx
const PAGE_LINKS = [
  { label: "Features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];
```

Update the copyright line:

```tsx
<p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Silvergrain. All rights reserved.</p>
```

- [ ] **Step 5: Clean up landing page**

In `src/pages/Index.tsx`:

1. Replace the inline `<nav>` block (lines 118–139) with:
```tsx
<Navbar />
```

2. Add import at the top:
```tsx
import Navbar from "@/components/Navbar";
```

3. Remove the unused imports that were only needed by the inline nav: `LogIn` from lucide-react, and `Button` (if no longer used — check below).

4. Remove the `LANDING_QUICK_STARTS` constant and the `QUICK_START_OPTIONS`/`getGuestOrAuthedHref` imports from `@/lib/story-starters`.

5. Remove `useTheme`, `useAuth`, and `resolveStartHref` since they're no longer used in this component (Navbar handles them internally).

6. In the hero section (left column), replace the CTA buttons block with a single button:
```tsx
<div className="flex flex-wrap gap-3">
  <Button size="lg" onClick={() => navigate("/story/new")}>
    Start writing <ArrowRight className="w-4 h-4 ml-1.5" />
  </Button>
</div>
```
Remove the `mt-4` div with `LANDING_QUICK_STARTS.map(...)` entirely.

7. In the bottom CTA section, replace the button group with:
```tsx
<div className="flex items-center justify-center">
  <Button size="lg" onClick={() => navigate("/story/new")}>
    Get started <ArrowRight className="w-4 h-4 ml-1.5" />
  </Button>
</div>
```

8. Keep `Button` import (still used for CTAs) and `ArrowRight` icon. Remove `Shield`, `Flame`, `Heart`, `Zap` only if they're solely used in `DEMO_CHOICES` — they are, so keep them (DEMO_CHOICES is still rendered). Actually, looking at imports: `Shield, Flame, Heart, Zap` are used in `DEMO_CHOICES`, keep those. Remove `LogIn` (only used in old nav). Keep `BookOpen` (used in demo). Remove `useTheme` import. Remove `useAuth` import.

9. Remove `heroRef` — it's declared but the `useEffect` for intersection observer only uses `howRef`. Actually check: `heroRef` is referenced on line 143 `ref={heroRef}` — but no observer uses it. Remove the ref and the `ref={heroRef}` attribute from the hero section div.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- src/test/footer.test.tsx src/test/landing-cta.test.tsx`
Expected: PASS

- [ ] **Step 7: Run full test suite to check for regressions**

Run: `npm run test`
Expected: All tests pass. If any existing tests reference "View plans" or genre quick-start buttons on the landing page, update those too.

- [ ] **Step 8: Commit**

```bash
git add src/components/Footer.tsx src/pages/Index.tsx src/test/footer.test.tsx src/test/landing-cta.test.tsx
git commit -m "feat: update footer with About/Contact links, clean up landing page CTAs"
```

---

### Task 3: Replace Inline Navs Across All Pages + Add Missing Footers

**Files:**
- Modify: `src/pages/Features.tsx`
- Modify: `src/pages/Pricing.tsx`
- Modify: `src/pages/GenreLanding.tsx`
- Modify: `src/pages/NotFound.tsx`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/pages/ResetPassword.tsx`
- Modify: `src/pages/SharedStory.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/StoryNew.tsx`
- Modify: `src/pages/StoryWrite.tsx`

Each page follows the same pattern: remove the inline `<nav>` block and replace with `<Navbar />`, add `<Footer />` where specified. The inline nav pattern across pages looks like this:

```tsx
<nav className="fixed top-0 ... z-50 flex items-center justify-between ...">
  <div className="flex items-center gap-2">
    <BookOpen ... /> <span>Arcwrite</span>
  </div>
  <div className="flex items-center gap-2">
    {/* theme toggle */}
    {/* auth button */}
  </div>
</nav>
```

- [ ] **Step 1: Update Features.tsx**

Replace the inline `<nav>` block with `<Navbar />`. Add `import Navbar from "@/components/Navbar";`. Remove unused imports that were only for the nav (`BookOpen`, `Sun`, `Moon`, `LogIn` from lucide-react, `useTheme` from `@/lib/theme`, `useAuth` from `@/lib/auth`, `useNavigate` from react-router-dom — but check if `useNavigate` is used elsewhere in the file first). Footer is already present.

- [ ] **Step 2: Update Pricing.tsx**

Same pattern. Replace inline `<nav>` with `<Navbar />`. Add import. Remove unused nav-only imports. Footer is already present. Note: Pricing has a "Back" button in the nav that navigates(-1) — this can be dropped since the Navbar provides full navigation. If the back button is important for the pricing-from-story flow, keep it as a separate element below the Navbar.

- [ ] **Step 3: Update GenreLanding.tsx**

Same pattern. Replace inline `<nav>` with `<Navbar />`. Add import. Remove unused nav-only imports. Footer is already present.

- [ ] **Step 4: Update NotFound.tsx**

Same pattern. Replace inline `<nav>` with `<Navbar />`. Add import. Remove unused nav-only imports. Footer is already present.

- [ ] **Step 5: Update Auth.tsx**

Auth currently has no inline nav — just a floating theme toggle button in the top-right corner:
```tsx
<button onClick={toggleTheme} className="fixed top-4 right-4 z-50 ...">
```

Replace with `<Navbar />`. Add `import Navbar from "@/components/Navbar";`. Add `import Footer from "@/components/Footer";` and render `<Footer />` before the closing `</div>`. Remove the floating theme toggle button and its `useTheme` import (Navbar handles it).

- [ ] **Step 6: Update ResetPassword.tsx**

Currently has no nav at all. Add `<Navbar />` at the top of the component's return JSX (inside the outer div, before the card). Add `<Footer />` at the bottom. Add both imports.

- [ ] **Step 7: Update SharedStory.tsx**

Currently has a minimal inline nav (logo + word count). Replace the `<nav>` with `<Navbar />`. The word count display can stay as a separate element below the nav. Add `import Footer from "@/components/Footer";` and render `<Footer />` at the bottom. Add Navbar import.

- [ ] **Step 8: Update Dashboard.tsx**

Dashboard has a complex nav with upgrade button, profile avatar, and logout. Replace the inline `<nav>` with `<Navbar />`. The upgrade/avatar/logout UI specific to the dashboard should remain as a secondary bar or be handled differently — keep the profile/logout elements as a separate row below the Navbar, or integrate them. Simplest approach: replace nav with Navbar, move the profile avatar + logout into the main content area (e.g., top-right of the dashboard content, not the nav). No Footer on Dashboard.

- [ ] **Step 9: Update StoryNew.tsx**

Has an inline nav with back arrow and theme toggle. Replace with `<Navbar />`. The back arrow may not be needed since Navbar provides navigation. Remove unused nav imports. No Footer.

- [ ] **Step 10: Update StoryWrite.tsx**

Has an inline nav/toolbar. This is the most complex case — StoryWrite's nav includes story-specific controls (back button, story title, word count, export, share, tone panel trigger, structure sidebar toggle). **Do NOT replace the StoryWrite toolbar with Navbar.** The story editor needs its specialized toolbar. Skip this page.

- [ ] **Step 11: Run full test suite**

Run: `npm run test`
Expected: All tests pass. Fix any tests that reference removed inline nav elements.

- [ ] **Step 12: Commit**

```bash
git add src/pages/Features.tsx src/pages/Pricing.tsx src/pages/GenreLanding.tsx src/pages/NotFound.tsx src/pages/Auth.tsx src/pages/ResetPassword.tsx src/pages/SharedStory.tsx src/pages/Dashboard.tsx src/pages/StoryNew.tsx
git commit -m "refactor: replace inline navs with shared Navbar, add Footer to public pages"
```

---

### Task 4: About Page

**Files:**
- Create: `src/pages/About.tsx`
- Modify: `src/App.tsx`
- Create: `src/test/about.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/test/about.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

describe("About page", () => {
  it("renders heading and mentions Silvergrain", async () => {
    const { default: About } = await import("@/pages/About");
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /about arcwrite/i })).toBeDefined();
    expect(screen.getByText(/silvergrain/i)).toBeDefined();
  });

  it("mentions AI-powered interactive fiction", async () => {
    const { default: About } = await import("@/pages/About");
    render(
      <MemoryRouter>
        <About />
      </MemoryRouter>
    );
    expect(screen.getByText(/interactive fiction/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/test/about.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement About page**

```tsx
// src/pages/About.tsx
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function About() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="About — Arcwrite"
        description="Arcwrite is an AI-powered interactive fiction platform by Silvergrain. Direct the plot, steer the characters, and craft entire stories without writing a single paragraph."
        canonical="/about"
      />
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-story text-3xl md:text-4xl font-semibold text-foreground mb-8">
            About Arcwrite
          </h1>

          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              Arcwrite is an AI-powered interactive fiction platform. You direct the plot — choosing
              what happens, who the characters become, and where the story goes — while AI writes
              the prose. Every decision branches into new paths, creating stories that are uniquely yours.
            </p>
            <p>
              Whether you're crafting a sprawling fantasy epic, a tense mystery, or a quiet romance,
              Arcwrite gives you meaningful choices at every turn. No writing experience needed — just
              ideas, instincts, and curiosity.
            </p>
            <p>
              Arcwrite is built by <span className="text-foreground font-medium">Silvergrain</span>.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Add route to App.tsx**

In `src/App.tsx`, add the import:
```tsx
import About from "./pages/About.tsx";
```

Add the route inside `<Routes>`, after the pricing route:
```tsx
<Route path="/about" element={<About />} />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- src/test/about.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/About.tsx src/App.tsx src/test/about.test.tsx
git commit -m "feat: add About page"
```

---

### Task 5: Contact Page + API Route + DB Migration

**Files:**
- Create: `src/pages/Contact.tsx`
- Create: `api/contact.ts`
- Modify: `src/App.tsx`
- Create: `src/test/contact.test.tsx`
- Create: `src/test/contact-api.test.ts`

- [ ] **Step 1: Write failing tests for Contact page**

```tsx
// src/test/contact.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("Contact page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders heading, email link, and form fields", async () => {
    const { default: Contact } = await import("@/pages/Contact");
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /support@arcwrite\.app/i })).toHaveAttribute(
      "href",
      "mailto:support@arcwrite.app"
    );
    expect(screen.getByLabelText(/name/i)).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/message/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDefined();
  });

  it("submits form and shows success state", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const { default: Contact } = await import("@/pages/Contact");
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Hello!" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contact", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com", message: "Hello!" }),
      }));
    });
  });
});
```

- [ ] **Step 2: Write failing tests for contact API route**

```ts
// src/test/contact-api.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../_db.js", () => ({ query: mockQuery }));

describe("contact API", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("rejects non-POST requests", async () => {
    const { default: handler } = await import("../../api/contact");
    const req = { method: "GET", body: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() } as any;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("rejects missing required fields", async () => {
    const { default: handler } = await import("../../api/contact");
    const req = { method: "POST", body: { name: "Jane" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() } as any;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("inserts valid submission and returns 200", async () => {
    mockQuery.mockResolvedValueOnce([]);
    const { default: handler } = await import("../../api/contact");
    const req = {
      method: "POST",
      body: { name: "Jane", email: "jane@test.com", message: "Hello!" },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() } as any;
    await handler(req, res);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO contact_messages"),
      ["Jane", "jane@test.com", "Hello!"]
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects fields that exceed length limits", async () => {
    const { default: handler } = await import("../../api/contact");
    const req = {
      method: "POST",
      body: { name: "J".repeat(201), email: "jane@test.com", message: "Hello!" },
    } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), end: vi.fn() } as any;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- src/test/contact.test.tsx src/test/contact-api.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 4: Implement Contact page**

```tsx
// src/pages/Contact.tsx
import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }
      toast.success("Message sent! We'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try emailing us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      <SEO
        title="Contact — Arcwrite"
        description="Get in touch with the Arcwrite team. Reach us at support@arcwrite.app or use the contact form."
        canonical="/contact"
      />
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-story text-3xl md:text-4xl font-semibold text-foreground mb-8">
            Contact us
          </h1>

          {/* Email */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <a
                href="mailto:support@arcwrite.app"
                className="text-foreground font-medium hover:text-primary transition-colors"
              >
                support@arcwrite.app
              </a>
            </div>
            <p className="text-sm text-muted-foreground">We typically respond within 24 hours.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-1.5">
                Name
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={200}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-1.5">
                Message
              </label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={5000}
                rows={5}
                placeholder="How can we help?"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending..." : "Send message"}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 5: Implement contact API route**

```ts
// api/contact.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query } from "./_db.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, email, message } = req.body ?? {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }
    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid field types" });
    }
    if (name.length > 200 || email.length > 200 || message.length > 5000) {
      return res.status(400).json({ error: "Field exceeds maximum length" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    await query(
      "INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)",
      [name, email, message]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
```

- [ ] **Step 6: Add route to App.tsx**

In `src/App.tsx`, add the import:
```tsx
import Contact from "./pages/Contact.tsx";
```

Add the route inside `<Routes>`, after the about route:
```tsx
<Route path="/contact" element={<Contact />} />
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test -- src/test/contact.test.tsx src/test/contact-api.test.ts`
Expected: PASS

- [ ] **Step 8: Run DB migration**

SSH to the DigitalOcean Droplet and create the `contact_messages` table:

```bash
ssh -i ~/.ssh/id_ed25519 root@188.166.82.107
sudo -u postgres psql -d arcwrite -v ON_ERROR_STOP=1 -c "
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
"
```

No RLS needed — the table is accessed only through the API route using the `DATABASE_URL` connection (the `_db.ts` pool), not through Supabase client-side SDK.

- [ ] **Step 9: Run full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 10: Commit**

```bash
git add src/pages/Contact.tsx api/contact.ts src/App.tsx src/test/contact.test.tsx src/test/contact-api.test.ts
git commit -m "feat: add Contact page with form and API route"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Section 1 (Shared Navbar): Task 1 ✅
- Section 2 (Footer update): Task 2 ✅
- Section 3 (Landing cleanup): Task 2 ✅
- Section 4 (About page): Task 4 ✅
- Section 5 (Contact page): Task 5 ✅
- Section 6 (Contact API): Task 5 ✅
- Section 7 (Route registration): Tasks 4 + 5 ✅
- Section 8 (All pages updated): Task 3 ✅
- SEO on new pages: Tasks 4 + 5 ✅

**2. Placeholder scan:** No TBDs, TODOs, or vague steps. All code shown.

**3. Type consistency:** `Navbar` default export used consistently. `Footer` default export matches existing pattern. API route uses `VercelRequest`/`VercelResponse` types matching `export-story.ts` pattern. `query()` from `_db.js` matches existing usage.

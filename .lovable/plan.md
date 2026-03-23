

## Rebrand: VibeWrite → Arcwrite

A find-and-replace across the entire codebase, changing every instance of "VibeWrite" to "Arcwrite" and "vibewrite" to "arcwrite".

### Files to update (18 files, ~114 occurrences)

**App pages (UI-visible branding):**
- `src/pages/Index.tsx` — nav logo, footer
- `src/pages/Auth.tsx` — login/signup logo
- `src/pages/Dashboard.tsx` — nav branding
- `src/pages/StoryNew.tsx` — nav logo
- `src/pages/StoryWrite.tsx` — nav/header
- `src/pages/SharedStory.tsx` — nav logo, "Created with" footer
- `src/pages/ResetPassword.tsx` — logo
- `src/pages/Pricing.tsx` — branding

**Config & meta:**
- `index.html` — `<title>`, meta tags (og:title, author, description)
- `public/robots.txt` — no change needed (no brand mention)

**Internals:**
- `src/lib/theme.tsx` — localStorage key `vibewrite-theme` → `arcwrite-theme`

**Tests:**
- `e2e/landing.spec.ts`, `e2e/auth.spec.ts`, `e2e/pricing.spec.ts`, `e2e/navigation.spec.ts`, `e2e/responsive.spec.ts`, `e2e/shared-story.spec.ts` — update `text=VibeWrite` selectors to `text=Arcwrite`

**Edge functions** (if any contain branding — already searched, covered above)

### Approach
Straightforward text replacement in each file. No structural or logic changes needed.


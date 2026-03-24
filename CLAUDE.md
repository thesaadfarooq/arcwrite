# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arcwrite is an AI-assisted interactive fiction writing platform. Users create branching choose-your-own-adventure stories with AI-generated text and choices. Built with React + Supabase, with Stripe subscriptions (Free/Plus/Pro tiers).

## Commands

```bash
bun run dev          # Dev server (Vite, port 8080)
bun run build        # Production build
bun run lint         # ESLint
bun run test         # Vitest (single run)
bun run test:watch   # Vitest (watch mode)
```

E2E tests use Playwright (`e2e/` directory) — run with `npx playwright test`.

## Architecture

**Stack:** React 18 + TypeScript, Vite + SWC, Tailwind CSS, shadcn/ui (Radix), Supabase (DB + Auth + Edge Functions), Stripe.

**Path alias:** `@/` maps to `src/`.

### Provider hierarchy (App.tsx)

`QueryClientProvider` → `ThemeProvider` → `AuthProvider` → `TooltipProvider` → `BrowserRouter`

### Routing

- `/` — Landing page
- `/auth` — Login/signup (PublicOnlyRoute — redirects to dashboard if logged in)
- `/dashboard` — User's stories (ProtectedRoute)
- `/story/new` — Create story (ProtectedRoute)
- `/story/:id` — Story editor (ProtectedRoute) — the main feature page
- `/pricing` — Subscription tiers
- `/s/:token` — Public shared story view

### Key modules

- `src/lib/auth.tsx` — Auth context with Supabase Auth, exposes `useAuth()` (user, session, tier, profile)
- `src/lib/story-api.ts` — All Supabase DB operations and edge function calls for stories
- `src/lib/subscription.ts` — Tier definitions with Stripe price/product IDs and limits
- `src/lib/theme.tsx` — Light/dark theme context
- `src/integrations/supabase/client.ts` — Supabase client initialization
- `src/integrations/supabase/types.ts` — Auto-generated database types

### Story data model

Stories use a tree structure: `stories` table (metadata: title, genre, tone, premise) → `story_nodes` table (tree nodes with parent_id self-reference). Each node has text content, summary, choices (JSON), story_state (JSON), and an `is_active` flag to track the current path. All tables use RLS — users can only access their own data.

### Supabase Edge Functions (`supabase/functions/`)

Deno-based TypeScript functions:
- `generate-section` — Streams AI text via OpenAI API (supports length presets: short/medium/long/epic)
- `generate-choices` — Generates 4 branching choices (safe, risky, emotional, chaotic)
- `summarize` — Summarizes story progress for context window management
- `check-subscription` — Validates user tier via Stripe
- `create-checkout` / `customer-portal` — Stripe payment flows
- `export-story` — PDF/HTML export

### UI patterns

- shadcn/ui components live in `src/components/ui/`
- Story-specific components in `src/components/story/`
- Fonts: "Lora" (serif) for story text, "Inter" (sans-serif) for UI
- Animations defined in `tailwind.config.ts`
- Resizable split panels via `react-resizable-panels`

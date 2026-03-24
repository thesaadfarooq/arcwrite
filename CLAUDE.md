# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arcwrite is an AI-assisted interactive fiction writing platform. Users create branching choose-your-own-adventure stories with AI-generated text and choices. Built with React + Supabase + Vercel, with Stripe subscriptions (Free/Plus/Pro tiers).

## Commands

```bash
npm run dev          # Dev server (Vercel dev, port 8080 — serves frontend + API routes)
npm run dev:vite     # Vite-only dev server (no API routes)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)
```

E2E tests use Playwright (`e2e/` directory) — run with `npx playwright test`.

## Architecture

**Stack:** React 18 + TypeScript, Vite + SWC, Tailwind CSS, shadcn/ui (Radix), Supabase (DB + Auth), Vercel (API routes), Stripe, OpenAI.

**Path alias:** `@/` maps to `src/`.

**Deployment:** Vercel. Frontend is a static Vite build. Backend logic lives in `api/` as Vercel functions.

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
- `src/lib/story-api.ts` — Story CRUD (Supabase direct) + AI/export calls (via `/api/` routes)
- `src/lib/subscription.ts` — Tier definitions with Stripe price/product IDs and limits
- `src/lib/theme.tsx` — Light/dark theme context
- `src/integrations/supabase/client.ts` — Supabase client initialization
- `src/integrations/supabase/types.ts` — Auto-generated database types

### Story data model

Stories use a tree structure: `stories` table (metadata: title, genre, tone, premise) → `story_nodes` table (tree nodes with parent_id self-reference). Each node has text content, summary, choices (JSON), story_state (JSON), and an `is_active` flag to track the current path. All tables use RLS — users can only access their own data.

### Vercel API Routes (`api/`)

AI functions (Edge runtime, streaming):
- `generate-section` — Streams AI text via OpenAI SSE (length presets: short/medium/long/epic)
- `generate-choices` — Streams OpenAI tool calls server-side, returns assembled JSON with 4 choices
- `summarize` — Streams OpenAI tool calls server-side, returns summary + story state

Stripe/export functions (Node.js runtime):
- `check-subscription` — Validates user tier via Stripe
- `create-checkout` / `customer-portal` — Stripe payment flows
- `export-story` — HTML export (uses Supabase admin client)

### Environment variables

Client-side (`VITE_` prefix, exposed to browser):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-side (API routes only):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`

### UI patterns

- shadcn/ui components live in `src/components/ui/`
- Story-specific components in `src/components/story/`
- Fonts: "Lora" (serif) for story text, "Inter" (sans-serif) for UI
- Animations defined in `tailwind.config.ts`
- Resizable split panels via `react-resizable-panels`

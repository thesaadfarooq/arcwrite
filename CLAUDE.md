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

### Environment variables & test/prod isolation

The project uses **full environment isolation** to prevent cross-contamination between local development and production.

**Two databases** on the same DigitalOcean instance:
- `arcwrite` — production database (used by Vercel production deployments)
- `arcwrite_test` — test database (used locally and by Vercel preview deployments)

**Two Stripe environments:**
- Live keys (`sk_live_*`) + live product IDs — production only
- Sandbox keys (`sk_test_*`) + sandbox product IDs — local dev and previews

**How it works:**
- `.env` (gitignored) — points to `arcwrite_test` DB + Stripe sandbox. This is what `vercel dev` and `vite dev` use locally.
- Vercel dashboard — env vars are scoped by environment:
  - **Production**: prod DB, live Stripe key, live product/price IDs
  - **Preview + Development**: test DB, sandbox Stripe key, sandbox product/price IDs
- Supabase auth and OpenAI are shared (same keys) since they don't store environment-specific state.

**Important:** Stripe product/price IDs have **no hardcoded fallbacks** in the code. They must be set via env vars (`STRIPE_PLUS_PRODUCT_ID`, `STRIPE_PRO_PRODUCT_ID`, `VITE_STRIPE_*`). If missing, tier resolution defaults to "free". This prevents accidental cross-environment contamination.

**When running migrations**, always apply to both databases:
```bash
# Production
sudo -u postgres psql -d arcwrite -c "ALTER TABLE ..."
# Test
sudo -u postgres psql -d arcwrite_test -c "ALTER TABLE ..."
```

**Environment variable reference:**

Client-side (`VITE_` prefix, exposed to browser):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PLUS_PRICE_ID`, `VITE_STRIPE_PRO_PRICE_ID`
- `VITE_STRIPE_PLUS_PRODUCT_ID`, `VITE_STRIPE_PRO_PRODUCT_ID`

Server-side (API routes only):
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`
- `STRIPE_PLUS_PRODUCT_ID`, `STRIPE_PRO_PRODUCT_ID`
- `DATABASE_URL` — points to `arcwrite_test` locally, `arcwrite` in production

### UI patterns

- shadcn/ui components live in `src/components/ui/`
- Story-specific components in `src/components/story/`
- Fonts: "Lora" (serif) for story text, "Inter" (sans-serif) for UI
- Animations defined in `tailwind.config.ts`
- Resizable split panels via `react-resizable-panels`

## Project Structure & Module Organization
Arcwrite is a React 18 + TypeScript app with Vercel API routes. UI code lives in `src/`, with pages under `src/pages/`, reusable UI under `src/components/`, and story-specific logic in `src/components/story/` and `src/lib/`. Serverless endpoints live in `api/`; database routes are under `api/db/`. Tests live in `src/test/`. Static assets belong in `public/`, and longer design/plan documents are stored in `docs/`.

## Build, Test, and Development Commands
- `npm run dev`: start the Vite frontend only.
- `npm run dev:vercel`: run the app locally with Vercel functions on `http://localhost:8080`.
- `npm run build`: create the production build.
- `npm run build:dev`: build with development mode settings.
- `npm run lint`: run ESLint across the repo.
- `npm run test`: run the full Vitest suite once.
- `npm run test -- src/test/story-arc.test.ts`: run a focused test file.
- `npx playwright test`: run browser E2E tests in `e2e/` when needed.

## Coding Style & Naming Conventions
Use TypeScript, 2-space indentation, and ES module syntax. Prefer named exports for shared utilities. React components use PascalCase filenames such as `StoryWrite.tsx`; helpers use kebab-free camelCase or descriptive filenames like `story-api.ts`. Keep files focused: UI in components, network/database logic in `api/` or `src/lib/`. Use the existing `@/` path alias for imports from `src/`. Lint with ESLint before pushing.

## Testing Guidelines
Vitest and Testing Library are the default stack. Add or update tests for any behavior change, especially for API routes, story generation logic, and page flows. Place tests in `src/test/` and name them after the feature, for example `story-write-arc.test.tsx`. Prefer focused regression tests over broad snapshot coverage.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `feat:`, `fix:`, `refactor:`, and `chore:`. Keep commit titles short and imperative, for example `feat: add story arc pacing`. PRs should include a concise summary, test evidence (`npm run test`, `npm run build`), and screenshots or screen recordings for UI changes.

## DigitalOcean DB Access
Both databases (`arcwrite` and `arcwrite_test`) run on the DigitalOcean Droplet at `188.166.82.107`. For read-only inspection from this repo, load `.env` and use the app connection (note: `.env` points to `arcwrite_test` by default):

```bash
set -a; . ./.env; set +a
psql "$DATABASE_URL" -c '\d stories'
```

The `DATABASE_URL` user can inspect data but does not own the schema. For migrations or `ALTER TABLE`, SSH to the Droplet with the existing key and run `psql` as the local `postgres` user:

```bash
ssh -i ~/.ssh/id_ed25519 root@188.166.82.107
sudo -u postgres psql -d arcwrite -c '\d stories'       # production
sudo -u postgres psql -d arcwrite_test -c '\d stories'   # test
```

Example migration pattern (apply to BOTH databases):

```bash
sudo -u postgres psql -d arcwrite -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;"
sudo -u postgres psql -d arcwrite_test -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;"
```

## Security & Configuration Tips
Do not commit secrets. Local environment values belong in `.env`. This project uses Supabase auth, Stripe, OpenAI, and a self-hosted Postgres connection via `DATABASE_URL`; treat all production credentials and SSH keys as sensitive.

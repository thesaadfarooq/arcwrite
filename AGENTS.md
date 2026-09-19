# Repository Guidelines

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

## Neon DB Access
Both databases (`neondb` for production, `arcwrite_dev` for dev/preview/local) live in one Neon project, managed through the Vercel Marketplace integration (store "Arcwrite-DB"). The connection string owns the schema — no SSH needed.

Dev database (what `.env` points to):

```bash
set -a; . ./.env; set +a
psql "$DATABASE_URL" -c '\d stories'
```

Production database (pull the prod connection string from Vercel first — keep the pulled file out of the repo):

```bash
vercel env pull --environment=production /tmp/prod.env
set -a; . /tmp/prod.env; set +a
psql "$DATABASE_URL" -c '\d stories'
```

Migration pattern (apply to BOTH databases):

```bash
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;"
psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;"
```

Notes:
- `DATABASE_URL` is the pooled (PgBouncer) endpoint; `DATABASE_URL_UNPOOLED` bypasses the pooler — prefer it for DDL and `CREATE DATABASE`.
- A fresh database is bootstrapped with `scripts/schema.sql` (the canonical schema).

## Security & Configuration Tips
Do not commit secrets. Local environment values belong in `.env`. This project uses Clerk auth, Stripe, OpenAI, and Neon Postgres (via the Vercel Marketplace) through `DATABASE_URL`; treat all production credentials as sensitive.

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

## DigitalOcean DB Access
The production Postgres database runs on the DigitalOcean Droplet at `188.166.82.107`. For read-only inspection from this repo, load `.env` and use the app connection:

```bash
set -a; . ./.env; set +a
psql "$DATABASE_URL" -c '\d stories'
```

The `DATABASE_URL` user can inspect data but does not own the schema. For migrations or `ALTER TABLE`, SSH to the Droplet with the existing key and run `psql` as the local `postgres` user:

```bash
ssh -i ~/.ssh/id_ed25519 root@188.166.82.107
sudo -u postgres psql -d arcwrite -c '\d stories'
```

Example migration pattern:

```bash
sudo -u postgres psql -d arcwrite -v ON_ERROR_STOP=1 \
  -c "ALTER TABLE stories ADD COLUMN IF NOT EXISTS target_turns integer DEFAULT 35;"
```

## Security & Configuration Tips
Do not commit secrets. Local environment values belong in `.env`. This project uses Supabase auth, Stripe, OpenAI, and a self-hosted Postgres connection via `DATABASE_URL`; treat all production credentials and SSH keys as sensitive.

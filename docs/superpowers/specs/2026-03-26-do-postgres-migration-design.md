# DigitalOcean Postgres Migration — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Goal:** Migrate Arcwrite's database from Supabase free tier to a self-hosted Postgres on a DigitalOcean Droplet to eliminate cold starts, pausing, and connection limits.

---

## Motivation

Supabase free tier pauses after 1 week of inactivity, has ~60 connection limits, and introduces cold-start latency on wake. With $200 in free DigitalOcean credits (33 months of coverage at $6/mo), a self-hosted Postgres eliminates all three issues while keeping the same stack everywhere else.

## Architecture Overview

```
Browser
  ├── supabase.auth.*  →  Supabase Auth (stays, free tier)
  └── fetch('/api/db/*')  →  Vercel Functions  →  DO Droplet Postgres
                                                    ($6/mo, 1 vCPU, 1GB RAM)

Existing AI/Stripe API routes remain unchanged.
```

**What moves:** Database tables (stories, story_nodes, profiles) and all read/write queries.
**What stays:** Supabase Auth, Vercel hosting, AI routes, Stripe routes, frontend routing/UI.

## 1. Droplet Setup

- **Spec:** $6/mo Droplet (1 vCPU, 1GB RAM, 25GB SSD)
- **OS:** Ubuntu 24.04 LTS
- **Postgres:** Version 16 via `apt`
- **Database:** `arcwrite` with a dedicated `arcwrite_app` user (non-superuser, CRUD permissions only)
- **SSL:** Self-signed certificate for encrypted connections
- **`pg_hba.conf`:** `hostssl all arcwrite_app 0.0.0.0/0 scram-sha-256` — SSL-only, password required from any IP
- **`postgresql.conf`:** `listen_addresses = '0.0.0.0'`, SSL enabled
- **Firewall (UFW):** Allow 22/tcp (SSH), allow 5432/tcp (Postgres), deny everything else
- **Connection string:** `postgresql://arcwrite_app:<password>@<droplet-ip>:5432/arcwrite?sslmode=require` stored as `DATABASE_URL` Vercel env var

A `scripts/setup-droplet.sh` script automates the full setup. User SCPs it to the Droplet and runs it.

## 2. Database Schema

Recreate the 3 core tables with the same column structure as Supabase, minus RLS (access control moves to API layer):

### `profiles`
- `id` (uuid, PK, default gen_random_uuid()) — internal surrogate key
- `user_id` (uuid, UNIQUE, NOT NULL) — Supabase Auth user ID, used for all lookups
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `tier` (text, NOT NULL, default 'free') — subscription tier
- `tier_override` (text, nullable) — manual tier override (bypasses Stripe check)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### `stories`
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, FK → profiles.user_id, NOT NULL)
- `title` (text, NOT NULL)
- `genre` (text, nullable)
- `tone` (text, nullable)
- `premise` (text, nullable)
- `status` (text, NOT NULL, default 'in_progress') — e.g. in_progress, draft, completed
- `share_token` (text, nullable, UNIQUE)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### `story_nodes`
- `id` (uuid, PK, default gen_random_uuid())
- `story_id` (uuid, FK → stories.id ON DELETE CASCADE, NOT NULL)
- `parent_id` (uuid, FK → story_nodes.id, nullable)
- `text` (text, NOT NULL)
- `summary` (text, nullable)
- `choices` (jsonb, nullable)
- `story_state` (jsonb, nullable)
- `is_active` (boolean, default true)
- `chosen_option` (jsonb, nullable) — object with `label` field, not plain text
- `starts_chapter` (boolean, NOT NULL, default false)
- `chapter_title` (text, nullable)
- `created_at` (timestamptz, default now())

Indexes:
- `stories(user_id)`
- `stories(share_token)` WHERE share_token IS NOT NULL
- `story_nodes(story_id)`
- `story_nodes(parent_id)`

Schema lives in `scripts/schema.sql`, also executed by the setup script.

## 3. API Layer

### Shared DB module: `api/_db.ts`

- Creates a `pg.Pool` from `DATABASE_URL` env var
- Exports `query(text, params)` helper
- SSL mode: `rejectUnauthorized: false` (self-signed cert — acceptable for this scale; upgrade to Let's Encrypt CA-signed cert if a domain is pointed at the Droplet later)
- Pool size: 5 connections (sufficient for Vercel free tier concurrency)

### Auth middleware: `api/_auth.ts`

- Reads `Authorization: Bearer <token>` header
- Calls `supabase.auth.getUser(token)` to verify JWT
- Returns `user.id` or 401
- Ensures profile row exists (upsert on first API call, keyed on `user_id` column: `ON CONFLICT (user_id) DO NOTHING`)

### API Routes

All routes live under `api/db/` to avoid conflict with existing `api/` routes.

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `api/db/stories.ts` | GET | Yes | List user's stories (ordered by updated_at desc) |
| `api/db/stories.ts` | POST | Yes | Create a story |
| `api/db/stories/[id].ts` | GET | Yes | Get single story (owner only) |
| `api/db/stories/[id].ts` | PATCH | Yes | Update story fields |
| `api/db/stories/[id].ts` | DELETE | Yes | Delete story + cascade nodes |
| `api/db/stories/count.ts` | GET | Yes | Count user's stories (for tier limit check) |
| `api/db/nodes.ts` | GET | Yes | Get nodes for a story (`?story_id=&active=true\|all`) |
| `api/db/nodes.ts` | POST | Yes | Create a node |
| `api/db/nodes/[id].ts` | PATCH | Yes | Update a node |
| `api/db/nodes/[id]/jump.ts` | POST | Yes | Jump to node (deactivate all, reactivate ancestor path) |
| `api/db/nodes/[id]/split.ts` | POST | Yes | Split node at position (update + insert + re-parent) |
| `api/db/nodes/[id]/merge.ts` | POST | Yes | Merge node with parent (multi-step) |
| `api/db/nodes/[id]/subtree.ts` | DELETE | Yes | Delete node and all descendants |
| `api/db/shared/[token].ts` | GET | No | Get shared story + nodes (public) |
| `api/db/profile.ts` | GET | Yes | Get user profile |

All authenticated routes scope queries with `WHERE user_id = $1` using the verified auth user ID. This replaces Supabase RLS.

Multi-step node operations (jump, split, merge, delete subtree) run inside a single database transaction to prevent partial state on failure — an improvement over the current Supabase approach which has no transaction safety.

### Error handling

- Auth failure: 401 `{ error: "Unauthorized" }`
- Not found / not owned: 404 `{ error: "Not found" }`
- Validation errors: 400 `{ error: "<message>" }`
- DB errors: 500 `{ error: "Internal server error" }` (no leaking internals)

## 4. Frontend Migration

### New module: `src/lib/api-client.ts`

A thin wrapper around `fetch('/api/db/*')` that:
- Gets the current Supabase auth token via `supabase.auth.getSession()`
- Attaches `Authorization: Bearer <token>` header
- Parses JSON responses
- Throws on non-2xx with the error message from the API

### Call site rewrites

| File | Current | New |
|---|---|---|
| `src/lib/auth.tsx` | `supabase.from("profiles")` | `apiClient.getProfile()` |
| `src/pages/Dashboard.tsx` | `supabase.from("stories").select().order()` | `apiClient.getStories()` |
| `src/pages/StoryNew.tsx` | `supabase.from("stories").select("id", {count})` | `apiClient.getStoryCount()` |
| `src/pages/StoryNew.tsx` | `createStory()` (via story-api.ts) | Same function, new internals |
| `src/pages/StoryWrite.tsx` | `supabase.from("story_nodes").*` | `apiClient.getNodes()`, `.createNode()`, `.updateNode()` |
| `src/pages/SharedStory.tsx` | `supabase.from("stories").eq("share_token")` | `apiClient.getSharedStory(token)` |
| `src/lib/story-api.ts` | `supabase.from("stories").insert/update/delete` | Rewrite internals to use `apiClient` |
| `src/components/dashboard/EditableStoryCard.tsx` | `supabase.from("stories").update/delete` | `apiClient.updateStory()`, `.deleteStory()` |
| `api/export-story.ts` | Supabase admin client queries | Direct Postgres queries via `_db.ts` |
| `api/og-shared-story.ts` | Supabase client queries for shared story | Direct Postgres queries via `_db.ts` (reuses shared query logic) |

### What stays on Supabase client

All `supabase.auth.*` calls remain unchanged:
- `supabase.auth.signInWithPassword()`
- `supabase.auth.signUp()`
- `supabase.auth.getSession()`
- `supabase.auth.onAuthStateChange()`
- `supabase.auth.signOut()`

## 5. Data Migration

**Approach:** Fresh start. No data migration needed.
- All existing accounts are test accounts
- Schema is created fresh by the setup script
- Profiles are auto-created on first authenticated API call (upsert in auth middleware)

## 6. Rollback Plan

If issues arise post-migration:
- Supabase project remains active (not deleted)
- Revert the frontend changes (git revert)
- Supabase DB still has the old schema + RLS policies
- Recovery time: minutes (just a deploy)

Supabase project should not be deleted until the DO setup has been stable for at least 2 weeks.

## 7. Out of Scope

- Database backups / automated snapshots (can add later, DO has weekly backups for $1.20/mo)
- Connection pooling via PgBouncer (pool of 5 is fine for now)
- Monitoring / alerting on the Droplet
- Migrating Supabase Auth to self-hosted (stays on Supabase)
- Changing the frontend UI or adding features
- Modifying AI or Stripe API routes (except export-story and og-shared-story which have DB queries)

## 8. Verification Criteria

- [ ] Droplet is running with Postgres accessible over SSL
- [ ] All API routes return correct data for authenticated users
- [ ] Story CRUD works end-to-end (create, read, update, delete)
- [ ] Node CRUD works (create, update, fetch tree, active filter)
- [ ] Node operations work (jump, split, merge, delete subtree)
- [ ] Shared stories work for both anonymous and authenticated viewers
- [ ] Story count limit check works (fail-closed on error)
- [ ] Auth flow works (signup, login, session persistence)
- [ ] Profile auto-creation on first login
- [ ] Existing AI routes (generate-section, generate-choices, summarize) still work
- [ ] Existing Stripe routes still work
- [ ] Export story works with new DB
- [ ] OG shared story route works with new DB
- [ ] No Supabase DB calls remain in frontend or API routes (only auth calls)

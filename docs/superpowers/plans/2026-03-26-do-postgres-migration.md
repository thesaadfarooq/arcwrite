# DigitalOcean Postgres Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Arcwrite's database from Supabase free tier to a self-hosted Postgres on a DigitalOcean Droplet, replacing all `supabase.from()` calls with Vercel API routes.

**Architecture:** New Vercel API routes under `api/db/` connect to a DO Droplet Postgres via `DATABASE_URL`. Frontend calls `fetch('/api/db/*')` through a thin `api-client.ts` wrapper. Supabase Auth stays — JWTs are verified server-side via `supabase.auth.getUser()`. Multi-step node operations (jump, split, merge, delete subtree) run in DB transactions.

**Tech Stack:** pg (node-postgres), Vercel Functions (Node.js runtime), Supabase Auth (JWT verification), PostgreSQL 16

**Spec:** `docs/superpowers/specs/2026-03-26-do-postgres-migration-design.md`

---

## File Structure

### New files to create

```
scripts/
├── setup-droplet.sh          # Automated Droplet setup (Postgres, SSL, firewall, schema)
├── schema.sql                # Database schema (profiles, stories, story_nodes)

api/
├── _db.ts                    # Shared pg.Pool connection + query helper
├── _auth.ts                  # UPDATE: Add ensureProfile() helper using _db.ts
├── db/
│   ├── stories.ts            # GET (list) + POST (create)
│   ├── stories/
│   │   ├── [id].ts           # GET + PATCH + DELETE single story
│   │   └── count.ts          # GET story count for tier limit
│   ├── nodes.ts              # GET (list with ?active filter) + POST (create)
│   ├── nodes/
│   │   └── [id]/
│   │       ├── index.ts      # PATCH single node
│   │       ├── jump.ts       # POST jump to node (transaction)
│   │       ├── split.ts      # POST split node (transaction)
│   │       ├── merge.ts      # POST merge with parent (transaction)
│   │       └── subtree.ts    # DELETE node + descendants (transaction)
│   ├── shared/
│   │   └── [token].ts        # GET shared story (no auth)
│   └── profile.ts            # GET user profile

src/lib/
├── api-client.ts             # Frontend fetch wrapper for /api/db/* routes
```

### Existing files to modify

```
src/lib/story-api.ts          # Rewrite all DB helpers to use api-client
src/lib/auth.tsx              # Replace profile fetch with api-client
src/pages/Dashboard.tsx       # Replace supabase.from() with api-client
src/pages/StoryNew.tsx        # Replace count check with api-client
src/pages/StoryWrite.tsx      # Replace node ops + share with api-client
src/pages/SharedStory.tsx     # Replace shared story fetch with api-client
src/components/dashboard/EditableStoryCard.tsx  # Replace update/delete with api-client
api/export-story.ts           # Replace Supabase admin queries with _db.ts
api/og-shared-story.ts        # Replace Supabase queries with _db.ts
api/check-subscription.ts     # Replace Supabase admin queries with _db.ts
api/_auth.ts                  # Add ensureProfile() that upserts into DO Postgres
package.json                  # Add pg dependency
```

---

## Task 1: Droplet Setup Script & Schema

**Files:**
- Create: `scripts/setup-droplet.sh`
- Create: `scripts/schema.sql`

This task produces the infrastructure scripts. The user will SCP and run them on the Droplet.

- [ ] **Step 1: Write schema.sql**

```sql
-- scripts/schema.sql
-- Arcwrite database schema for DigitalOcean Postgres

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (synced with Supabase Auth user IDs)
CREATE TABLE profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL,
  display_name text,
  avatar_url   text,
  tier         text NOT NULL DEFAULT 'free',
  tier_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Stories table
CREATE TABLE stories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title       text NOT NULL,
  genre       text,
  tone        text,
  premise     text,
  status      text NOT NULL DEFAULT 'in_progress',
  share_token text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Story nodes (tree structure)
CREATE TABLE story_nodes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id       uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  parent_id      uuid REFERENCES story_nodes(id),
  text           text NOT NULL DEFAULT '',
  summary        text,
  choices        jsonb,
  story_state    jsonb,
  is_active      boolean NOT NULL DEFAULT true,
  chosen_option  jsonb,
  starts_chapter boolean NOT NULL DEFAULT false,
  chapter_title  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_share_token ON stories(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_story_nodes_story_id ON story_nodes(story_id);
CREATE INDEX idx_story_nodes_parent_id ON story_nodes(parent_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: Write setup-droplet.sh**

```bash
#!/usr/bin/env bash
# scripts/setup-droplet.sh
# Run as root on a fresh Ubuntu 24.04 Droplet
# Usage: bash setup-droplet.sh <db_password>

set -euo pipefail

DB_PASSWORD="${1:?Usage: bash setup-droplet.sh <db_password>}"
DB_NAME="arcwrite"
DB_USER="arcwrite_app"

echo "==> Installing PostgreSQL 16..."
apt-get update -qq
apt-get install -y -qq postgresql-16 postgresql-client-16 ufw

echo "==> Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 5432/tcp
echo "y" | ufw enable

echo "==> Configuring PostgreSQL..."

# Generate self-signed SSL cert
SSL_DIR="/etc/postgresql/16/main"
openssl req -new -x509 -days 3650 -nodes \
  -out "$SSL_DIR/server.crt" \
  -keyout "$SSL_DIR/server.key" \
  -subj "/CN=arcwrite-db" 2>/dev/null
chown postgres:postgres "$SSL_DIR/server.crt" "$SSL_DIR/server.key"
chmod 600 "$SSL_DIR/server.key"

# Configure postgresql.conf
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '0.0.0.0'/" "$PG_CONF"
sed -i "s/#ssl = off/ssl = on/" "$PG_CONF"
# ssl might already be on in some installs, ensure it
grep -q "^ssl = on" "$PG_CONF" || echo "ssl = on" >> "$PG_CONF"

# Configure pg_hba.conf — SSL-only remote access
PG_HBA="/etc/postgresql/16/main/pg_hba.conf"
echo "# Allow SSL connections from anywhere for arcwrite_app" >> "$PG_HBA"
echo "hostssl all ${DB_USER} 0.0.0.0/0 scram-sha-256" >> "$PG_HBA"

# Restart to apply config
systemctl restart postgresql

echo "==> Creating database and user..."
sudo -u postgres psql <<SQL
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "==> Running schema..."
sudo -u postgres psql -d "${DB_NAME}" -f "$(dirname "$0")/schema.sql"

# Grant permissions on all tables to the app user
sudo -u postgres psql -d "${DB_NAME}" <<SQL
GRANT ALL ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

echo ""
echo "==> Done! Connection string:"
echo "postgresql://${DB_USER}:${DB_PASSWORD}@$(hostname -I | awk '{print $1}'):5432/${DB_NAME}?sslmode=require"
echo ""
echo "Add this as DATABASE_URL in your Vercel environment variables."
```

- [ ] **Step 3: Commit**

```bash
git add scripts/setup-droplet.sh scripts/schema.sql
git commit -m "infra: add Droplet setup script and database schema for DO Postgres migration"
```

---

## Task 2: Install pg + Shared DB Module

**Files:**
- Modify: `package.json` (add `pg` + `@types/pg`)
- Create: `api/_db.ts`

- [ ] **Step 1: Install pg**

```bash
npm install pg
npm install -D @types/pg
```

- [ ] **Step 2: Write api/_db.ts**

```typescript
// api/_db.ts
// Shared Postgres connection pool for all /api/db/* routes

import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const { rows } = await getPool().query(text, params);
  return rows as T[];
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function queryCount(
  text: string,
  params?: any[]
): Promise<number> {
  const { rows } = await getPool().query(text, params);
  return parseInt(rows[0]?.count ?? "0", 10);
}

// Transaction helper for multi-step operations
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/_db.ts package.json package-lock.json
git commit -m "feat: add pg connection pool and query helpers for DO Postgres"
```

---

## Task 3: Auth Middleware — Add ensureProfile

**Files:**
- Modify: `api/_auth.ts` (add ensureProfile helper)

The existing `api/_auth.ts` uses `supabase.auth.getUser(token)` — that stays. We add a helper that ensures a profile row exists in DO Postgres for the authenticated user.

- [ ] **Step 1: Read existing api/_lib/auth.ts**

Read `api/_lib/auth.ts` to understand the existing auth helper pattern. Note: `api/_auth.ts` does NOT exist yet — we are creating it as a new file.

- [ ] **Step 2: Create api/_auth.ts with ensureProfile**

Create a new file `api/_auth.ts`. This is separate from the existing `api/_lib/auth.ts` which handles JWT verification. This new file handles profile upsert into DO Postgres:

```typescript
import { queryOne } from "./_db";

// Ensures a profile row exists in DO Postgres for the given Supabase Auth user.
// Called by authenticated API routes after verifying the JWT.
// Returns the user_id for query scoping.
export async function ensureProfile(userId: string): Promise<string> {
  await queryOne(
    `INSERT INTO profiles (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  return userId;
}
```

Note: The existing `getAuthenticatedUser` function that calls `supabase.auth.getUser(token)` stays unchanged. `ensureProfile` is called after it in API routes.

- [ ] **Step 3: Commit**

```bash
git add api/_auth.ts
git commit -m "feat: add ensureProfile helper for DO Postgres profile upsert"
```

---

## Task 4: Story API Routes (CRUD)

**IMPORTANT — Error handling pattern for ALL API routes (Tasks 4–7):**
Every handler function body must be wrapped in a `try/catch`. On caught errors, return `res.status(500).json({ error: "Internal server error" })` — never leak raw error messages. This ensures the spec's fail-closed behavior and prevents information leakage.

**Files:**
- Create: `api/db/stories.ts` (GET list + POST create)
- Create: `api/db/stories/[id].ts` (GET + PATCH + DELETE)
- Create: `api/db/stories/count.ts` (GET count)

- [ ] **Step 1: Write api/db/stories.ts**

```typescript
// api/db/stories.ts — List stories (GET) and create story (POST)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../_lib/auth";
import { ensureProfile } from "../_auth";
import { query, queryOne } from "../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await ensureProfile(user.id);

    const stories = await query(
      `SELECT * FROM stories WHERE user_id = $1 ORDER BY updated_at DESC`,
      [user.id]
    );
    return res.json(stories);
  }

  if (req.method === "POST") {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    await ensureProfile(user.id);

    const { title, genre, tone, premise, status } = req.body;
    const story = await queryOne(
      `INSERT INTO stories (user_id, title, genre, tone, premise, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, title || "Untitled Story", genre || null, tone || null, premise || null, status || "in_progress"]
    );
    return res.status(201).json(story);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

- [ ] **Step 2: Write api/db/stories/[id].ts**

```typescript
// api/db/stories/[id].ts — GET, PATCH, DELETE single story
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../_lib/auth";
import { ensureProfile } from "../../_auth";
import { query, queryOne } from "../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  await ensureProfile(user.id);

  if (req.method === "GET") {
    const story = await queryOne(
      `SELECT * FROM stories WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
    if (!story) return res.status(404).json({ error: "Not found" });
    return res.json(story);
  }

  if (req.method === "PATCH") {
    const allowed = ["title", "genre", "tone", "premise", "status", "share_token"];
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        sets.push(`${key} = $${idx}`);
        vals.push(req.body[key]);
        idx++;
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

    vals.push(id, user.id);
    const story = await queryOne(
      `UPDATE stories SET ${sets.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      vals
    );
    if (!story) return res.status(404).json({ error: "Not found" });
    return res.json(story);
  }

  if (req.method === "DELETE") {
    const result = await query(
      `DELETE FROM stories WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user.id]
    );
    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

- [ ] **Step 3: Write api/db/stories/count.ts**

```typescript
// api/db/stories/count.ts — GET story count for tier limit check
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../_lib/auth";
import { queryCount } from "../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const count = await queryCount(
    `SELECT COUNT(*) FROM stories WHERE user_id = $1`,
    [user.id]
  );
  return res.json({ count });
}
```

- [ ] **Step 4: Verify routes work locally**

Start dev server and test with curl:
```bash
npm run dev
# In another terminal:
curl -s http://localhost:8080/api/db/stories -H "Authorization: Bearer <token>" | jq .
```

Note: This requires `DATABASE_URL` in `.env.local`. Set it after Droplet is provisioned.

- [ ] **Step 5: Commit**

```bash
git add api/db/stories.ts api/db/stories/\[id\].ts api/db/stories/count.ts
git commit -m "feat: add story CRUD API routes for DO Postgres"
```

---

## Task 5: Node API Routes (CRUD + List)

**Files:**
- Create: `api/db/nodes.ts` (GET list + POST create)
- Create: `api/db/nodes/[id]/index.ts` (PATCH single node)

- [ ] **Step 1: Write api/db/nodes.ts**

```typescript
// api/db/nodes.ts — GET nodes for a story + POST create node
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../_lib/auth";
import { query, queryOne } from "../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const { story_id, active } = req.query;
    if (typeof story_id !== "string") return res.status(400).json({ error: "story_id required" });

    // Verify story ownership
    const story = await queryOne(
      `SELECT id FROM stories WHERE id = $1 AND user_id = $2`,
      [story_id, user.id]
    );
    if (!story) return res.status(404).json({ error: "Story not found" });

    let sql = `SELECT * FROM story_nodes WHERE story_id = $1`;
    if (active !== "all") {
      sql += ` AND is_active = true`;
    }
    sql += ` ORDER BY created_at ASC`;

    const nodes = await query(sql, [story_id]);
    return res.json(nodes);
  }

  if (req.method === "POST") {
    const { story_id, parent_id, text, summary, story_state, choices, chosen_option, starts_chapter } = req.body;

    // Verify story ownership
    const story = await queryOne(
      `SELECT id FROM stories WHERE id = $1 AND user_id = $2`,
      [story_id, user.id]
    );
    if (!story) return res.status(404).json({ error: "Story not found" });

    const node = await queryOne(
      `INSERT INTO story_nodes (story_id, parent_id, text, summary, story_state, choices, chosen_option, starts_chapter)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        story_id,
        parent_id || null,
        text || "",
        summary || null,
        story_state ? JSON.stringify(story_state) : null,
        choices ? JSON.stringify(choices) : null,
        chosen_option ? JSON.stringify(chosen_option) : null,
        starts_chapter ?? false,
      ]
    );
    return res.status(201).json(node);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
```

- [ ] **Step 2: Write api/db/nodes/[id]/index.ts**

```typescript
// api/db/nodes/[id]/index.ts — PATCH single node
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../../_lib/auth";
import { queryOne } from "../../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Verify ownership through story
  const node = await queryOne(
    `SELECT sn.id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [id, user.id]
  );
  if (!node) return res.status(404).json({ error: "Not found" });

  const allowed = ["text", "summary", "choices", "story_state", "is_active", "chosen_option", "starts_chapter", "chapter_title", "parent_id"];
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const val = ["choices", "story_state", "chosen_option"].includes(key) && req.body[key] !== null
        ? JSON.stringify(req.body[key])
        : req.body[key];
      sets.push(`${key} = $${idx}`);
      vals.push(val);
      idx++;
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

  vals.push(id);
  const updated = await queryOne(
    `UPDATE story_nodes SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    vals
  );
  return res.json(updated);
}
```

- [ ] **Step 3: Commit**

```bash
git add api/db/nodes.ts api/db/nodes/\[id\]/index.ts
git commit -m "feat: add node CRUD API routes for DO Postgres"
```

---

## Task 6: Node Transaction Operations (Jump, Split, Merge, Delete Subtree)

**Files:**
- Create: `api/db/nodes/[id]/jump.ts`
- Create: `api/db/nodes/[id]/split.ts`
- Create: `api/db/nodes/[id]/merge.ts`
- Create: `api/db/nodes/[id]/subtree.ts`

These are the complex multi-step operations that currently run as separate Supabase calls with no transaction safety. The new versions run inside a single DB transaction.

Reference: `src/lib/story-api.ts` lines 238-459 for the current implementations.

- [ ] **Step 1: Write api/db/nodes/[id]/jump.ts**

Port `jumpToNode` from `story-api.ts:238-273`. Logic:
1. Deactivate all active nodes for the story
2. Fetch all nodes to build parent chain
3. Walk from target node up to root, collecting ancestor IDs
4. Reactivate all ancestor nodes

```typescript
// api/db/nodes/[id]/jump.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../../_lib/auth";
import { queryOne, withTransaction } from "../../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id: nodeId } = req.query;
  if (typeof nodeId !== "string") return res.status(400).json({ error: "Invalid id" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Verify ownership
  const node = await queryOne<{ story_id: string }>(
    `SELECT sn.story_id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [nodeId, user.id]
  );
  if (!node) return res.status(404).json({ error: "Not found" });

  await withTransaction(async (client) => {
    const storyId = node.story_id;

    // 1. Deactivate all active nodes
    await client.query(
      `UPDATE story_nodes SET is_active = false WHERE story_id = $1 AND is_active = true`,
      [storyId]
    );

    // 2. Fetch all nodes to build parent map
    const { rows: allNodes } = await client.query(
      `SELECT id, parent_id FROM story_nodes WHERE story_id = $1`,
      [storyId]
    );

    // 3. Walk from target to root
    const parentMap = new Map(allNodes.map((n: any) => [n.id, n.parent_id]));
    const pathIds: string[] = [];
    let current: string | null = nodeId;
    while (current) {
      pathIds.push(current);
      current = parentMap.get(current) ?? null;
    }

    // 4. Reactivate ancestor path
    if (pathIds.length > 0) {
      await client.query(
        `UPDATE story_nodes SET is_active = true WHERE story_id = $1 AND id = ANY($2)`,
        [storyId, pathIds]
      );
    }
  });

  return res.json({ success: true });
}
```

- [ ] **Step 2: Write api/db/nodes/[id]/subtree.ts**

Port `deleteNodeAndDescendants` from `story-api.ts:289-327`. Logic:
1. Fetch all nodes for the story
2. BFS from target node to find all descendant IDs
3. Delete all descendants + target
4. If target had a parent, jump to parent

```typescript
// api/db/nodes/[id]/subtree.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../../_lib/auth";
import { queryOne, withTransaction } from "../../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const { id: nodeId } = req.query;
  if (typeof nodeId !== "string") return res.status(400).json({ error: "Invalid id" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const node = await queryOne<{ story_id: string; parent_id: string | null }>(
    `SELECT sn.story_id, sn.parent_id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [nodeId, user.id]
  );
  if (!node) return res.status(404).json({ error: "Not found" });

  await withTransaction(async (client) => {
    const storyId = node.story_id;

    // 1. Fetch all nodes to build children map
    const { rows: allNodes } = await client.query(
      `SELECT id, parent_id FROM story_nodes WHERE story_id = $1`,
      [storyId]
    );

    // 2. BFS to find all descendants
    const childrenMap = new Map<string, string[]>();
    for (const n of allNodes) {
      if (n.parent_id) {
        const children = childrenMap.get(n.parent_id) || [];
        children.push(n.id);
        childrenMap.set(n.parent_id, children);
      }
    }

    const toDelete: string[] = [nodeId];
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenMap.get(current) || [];
      for (const child of children) {
        toDelete.push(child);
        queue.push(child);
      }
    }

    // 3. Delete all
    await client.query(
      `DELETE FROM story_nodes WHERE story_id = $1 AND id = ANY($2)`,
      [storyId, toDelete]
    );

    // 4. Jump to parent if it exists
    if (node.parent_id) {
      // Deactivate all
      await client.query(
        `UPDATE story_nodes SET is_active = false WHERE story_id = $1 AND is_active = true`,
        [storyId]
      );

      // Build parent map from remaining nodes
      const { rows: remaining } = await client.query(
        `SELECT id, parent_id FROM story_nodes WHERE story_id = $1`,
        [storyId]
      );
      const parentMap = new Map(remaining.map((n: any) => [n.id, n.parent_id]));
      const pathIds: string[] = [];
      let current: string | null = node.parent_id;
      while (current) {
        pathIds.push(current);
        current = parentMap.get(current) ?? null;
      }

      if (pathIds.length > 0) {
        await client.query(
          `UPDATE story_nodes SET is_active = true WHERE story_id = $1 AND id = ANY($2)`,
          [storyId, pathIds]
        );
      }
    }
  });

  return res.json({ success: true });
}
```

- [ ] **Step 3: Write api/db/nodes/[id]/split.ts**

Port `splitNodeAtPosition` from `story-api.ts:330-398`. Logic:
1. Fetch the target node
2. Split text at position
3. Update original node with first half
4. Insert new child node with second half
5. Re-parent any existing children to the new node
6. Clear choices/summary on the original node

```typescript
// api/db/nodes/[id]/split.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../../_lib/auth";
import { queryOne, withTransaction } from "../../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id: nodeId } = req.query;
  if (typeof nodeId !== "string") return res.status(400).json({ error: "Invalid id" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { position } = req.body; // paragraph index (splits on \n\n boundaries)
  if (typeof position !== "number") return res.status(400).json({ error: "position required" });

  // Verify ownership
  const ownerCheck = await queryOne(
    `SELECT sn.id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [nodeId, user.id]
  );
  if (!ownerCheck) return res.status(404).json({ error: "Not found" });

  const result = await withTransaction(async (client) => {
    // 1. Fetch the node
    const { rows: [node] } = await client.query(
      `SELECT * FROM story_nodes WHERE id = $1`,
      [nodeId]
    );
    if (!node) throw new Error("Node not found");

    // Split on paragraph boundaries (matching original story-api.ts behavior)
    const paragraphs = node.text.split("\n\n");
    const textBefore = paragraphs.slice(0, position).join("\n\n");
    const textAfter = paragraphs.slice(position).join("\n\n");

    // 2. Update original with first half
    await client.query(
      `UPDATE story_nodes SET text = $1 WHERE id = $2`,
      [textBefore, nodeId]
    );

    // 3. Insert new child with second half
    const { rows: [newNode] } = await client.query(
      `INSERT INTO story_nodes (story_id, parent_id, text, summary, story_state, choices, chosen_option, starts_chapter, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, true, $7)
       RETURNING *`,
      [node.story_id, nodeId, textAfter, node.summary, node.story_state, node.choices, node.is_active]
    );

    // 4. Re-parent existing children to new node
    const { rows: oldChildren } = await client.query(
      `SELECT id FROM story_nodes WHERE parent_id = $1 AND id != $2`,
      [nodeId, newNode.id]
    );
    if (oldChildren.length > 0) {
      await client.query(
        `UPDATE story_nodes SET parent_id = $1 WHERE parent_id = $2 AND id != $1`,
        [newNode.id, nodeId]
      );
    }

    // 5. Clear choices/summary on original
    await client.query(
      `UPDATE story_nodes SET choices = '[]'::jsonb, summary = NULL WHERE id = $1`,
      [nodeId]
    );

    return newNode;
  });

  return res.json(result);
}
```

- [ ] **Step 4: Write api/db/nodes/[id]/merge.ts**

Port `mergeNodeWithParent` from `story-api.ts:401-459`. Logic:
1. Fetch the node and its parent
2. Merge text (parent.text + node.text)
3. Update parent with merged data
4. Re-parent node's children to parent
5. Delete the node

```typescript
// api/db/nodes/[id]/merge.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../../../_lib/auth";
import { queryOne, withTransaction } from "../../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id: nodeId } = req.query;
  if (typeof nodeId !== "string") return res.status(400).json({ error: "Invalid id" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const ownerCheck = await queryOne(
    `SELECT sn.id FROM story_nodes sn
     JOIN stories s ON s.id = sn.story_id
     WHERE sn.id = $1 AND s.user_id = $2`,
    [nodeId, user.id]
  );
  if (!ownerCheck) return res.status(404).json({ error: "Not found" });

  const result = await withTransaction(async (client) => {
    // 1. Fetch the node
    const { rows: [node] } = await client.query(
      `SELECT * FROM story_nodes WHERE id = $1`, [nodeId]
    );
    if (!node || !node.parent_id) throw new Error("Cannot merge root node");

    // 2. Fetch parent
    const { rows: [parent] } = await client.query(
      `SELECT * FROM story_nodes WHERE id = $1`, [node.parent_id]
    );
    if (!parent) throw new Error("Parent not found");

    // 3. Update parent with merged content
    const mergedText = [parent.text, node.text].filter(Boolean).join("\n\n");
    await client.query(
      `UPDATE story_nodes SET text = $1, summary = $2, story_state = $3, choices = $4
       WHERE id = $5`,
      [
        mergedText,
        node.summary,
        node.story_state,
        node.choices,
        parent.id,
      ]
    );

    // 4. Re-parent children
    const { rows: grandchildren } = await client.query(
      `SELECT id FROM story_nodes WHERE parent_id = $1`, [nodeId]
    );
    if (grandchildren.length > 0) {
      await client.query(
        `UPDATE story_nodes SET parent_id = $1 WHERE parent_id = $2`,
        [parent.id, nodeId]
      );
    }

    // 5. Delete the merged node
    await client.query(`DELETE FROM story_nodes WHERE id = $1`, [nodeId]);

    // Return updated parent
    const { rows: [updated] } = await client.query(
      `SELECT * FROM story_nodes WHERE id = $1`, [parent.id]
    );
    return updated;
  });

  return res.json(result);
}
```

- [ ] **Step 5: Commit**

```bash
git add api/db/nodes/\[id\]/jump.ts api/db/nodes/\[id\]/subtree.ts api/db/nodes/\[id\]/split.ts api/db/nodes/\[id\]/merge.ts
git commit -m "feat: add transactional node operations (jump, split, merge, delete subtree)"
```

---

## Task 7: Shared Story + Profile API Routes

**Files:**
- Create: `api/db/shared/[token].ts`
- Create: `api/db/profile.ts`

- [ ] **Step 1: Write api/db/shared/[token].ts**

```typescript
// api/db/shared/[token].ts — Public shared story (no auth required)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { queryOne, query } from "../../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.query;
  if (typeof token !== "string") return res.status(400).json({ error: "Invalid token" });

  const story = await queryOne(
    `SELECT id, title, genre, premise FROM stories WHERE share_token = $1`,
    [token]
  );
  if (!story) return res.status(404).json({ error: "Story not found" });

  const nodes = await query(
    `SELECT text, chosen_option FROM story_nodes
     WHERE story_id = $1 AND is_active = true
     ORDER BY created_at ASC`,
    [story.id]
  );

  return res.json({ story, nodes });
}
```

- [ ] **Step 2: Write api/db/profile.ts**

```typescript
// api/db/profile.ts — GET user profile
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedUser } from "../_lib/auth";
import { ensureProfile } from "../_auth";
import { queryOne } from "../_db";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  await ensureProfile(user.id);

  const profile = await queryOne(
    `SELECT user_id, display_name, avatar_url, tier, tier_override FROM profiles WHERE user_id = $1`,
    [user.id]
  );
  return res.json(profile);
}
```

- [ ] **Step 3: Commit**

```bash
git add api/db/shared/\[token\].ts api/db/profile.ts
git commit -m "feat: add shared story and profile API routes"
```

---

## Task 8: Frontend API Client

**Files:**
- Create: `src/lib/api-client.ts`

This is the thin fetch wrapper that all frontend code will use instead of `supabase.from()`.

- [ ] **Step 1: Write src/lib/api-client.ts**

```typescript
// src/lib/api-client.ts
// Thin wrapper for /api/db/* routes. Attaches Supabase auth token automatically.

import { supabase } from "@/integrations/supabase/client";

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Stories ──

export function getStories() {
  return request<any[]>("/api/db/stories");
}

export function createStory(data: {
  title: string;
  genre?: string;
  tone?: string;
  premise?: string;
  status?: string;
}) {
  return request<any>("/api/db/stories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getStory(id: string) {
  return request<any>(`/api/db/stories/${id}`);
}

export function updateStory(id: string, data: Record<string, any>) {
  return request<any>(`/api/db/stories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteStory(id: string) {
  return request<{ success: boolean }>(`/api/db/stories/${id}`, {
    method: "DELETE",
  });
}

export function getStoryCount() {
  return request<{ count: number }>("/api/db/stories/count");
}

// ── Nodes ──

export function getNodes(storyId: string, active: "true" | "all" = "true") {
  return request<any[]>(`/api/db/nodes?story_id=${storyId}&active=${active}`);
}

export function createNode(data: {
  story_id: string;
  parent_id?: string | null;
  text?: string;
  summary?: string | null;
  story_state?: any;
  choices?: any;
  chosen_option?: any;
  starts_chapter?: boolean;
}) {
  return request<any>("/api/db/nodes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateNode(id: string, data: Record<string, any>) {
  return request<any>(`/api/db/nodes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function jumpToNode(nodeId: string) {
  return request<{ success: boolean }>(`/api/db/nodes/${nodeId}/jump`, {
    method: "POST",
  });
}

export function splitNode(nodeId: string, position: number) {
  return request<any>(`/api/db/nodes/${nodeId}/split`, {
    method: "POST",
    body: JSON.stringify({ position }),
  });
}

export function mergeNodeWithParent(nodeId: string) {
  return request<any>(`/api/db/nodes/${nodeId}/merge`, {
    method: "POST",
  });
}

export function deleteNodeSubtree(nodeId: string) {
  return request<{ success: boolean }>(`/api/db/nodes/${nodeId}/subtree`, {
    method: "DELETE",
  });
}

// ── Shared Stories ──

export function getSharedStory(token: string) {
  return request<{ story: any; nodes: any[] }>(`/api/db/shared/${token}`);
}

// ── Profile ──

export function getProfile() {
  return request<any>("/api/db/profile");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat: add frontend API client for DO Postgres routes"
```

---

## Task 9: Migrate story-api.ts to Use API Client

**Files:**
- Modify: `src/lib/story-api.ts`

This is the biggest rewrite. Every function that calls `supabase.from()` gets rewritten to use `api-client.ts`. Functions that call `/api/` routes for AI features (generate-section, generate-choices, summarize) stay unchanged.

- [ ] **Step 1: Read current story-api.ts thoroughly**

Read `src/lib/story-api.ts` in full. Identify every `supabase.from()` call.

- [ ] **Step 2: Rewrite DB functions**

Replace the internals of these functions (keep the same function signatures so callers don't break):

- `createStory` → call `apiClient.createStory()`
- `createStoryNode` → call `apiClient.createNode()`
- `getStoryNodes` → call `apiClient.getNodes(storyId, "true")`
- `getAllStoryNodes` → call `apiClient.getNodes(storyId, "all")`
- `getStory` → call `apiClient.getStory(id)`
- `updateStoryTitle` → call `apiClient.updateStory(id, { title })`
- `updateStoryTone` → call `apiClient.updateStory(id, { tone })`
- `jumpToNode` → call `apiClient.jumpToNode(nodeId)`
- `updateNodeChapterTitle` → call `apiClient.updateNode(id, { chapter_title })`
- `deleteNodeAndDescendants` → call `apiClient.deleteNodeSubtree(nodeId)`
- `splitNodeAtPosition` → call `apiClient.splitNode(nodeId, position)`
- `mergeNodeWithParent` → call `apiClient.mergeNodeWithParent(nodeId)`

Remove the `supabase` import if no longer needed for DB calls (it may still be needed for auth token in other parts of the file).

- [ ] **Step 3: Verify build compiles**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/story-api.ts
git commit -m "refactor: migrate story-api.ts from Supabase to API client"
```

---

## Task 10: Migrate Frontend Pages

**Files:**
- Modify: `src/lib/auth.tsx` (profile fetch)
- Modify: `src/pages/Dashboard.tsx` (story list, delete, duplicate, rename)
- Modify: `src/pages/StoryNew.tsx` (story count check)
- Modify: `src/pages/StoryWrite.tsx` (node choice update, share token)
- Modify: `src/pages/SharedStory.tsx` (shared story fetch)
- Modify: `src/components/dashboard/EditableStoryCard.tsx` (update/delete)

- [ ] **Step 1: Migrate auth.tsx profile fetch**

In `src/lib/auth.tsx`, find the profile fetch (currently `supabase.from("profiles").select("display_name, avatar_url").eq("user_id", session.user.id).single()`). Replace with:

```typescript
import * as apiClient from "@/lib/api-client";

// Replace the supabase.from("profiles") call with:
const profile = await apiClient.getProfile();
```

Keep the `supabase.auth.onAuthStateChange` and tier/subscription logic unchanged.

- [ ] **Step 2: Migrate Dashboard.tsx**

In `src/pages/Dashboard.tsx`:
- `fetchStories` (line ~49): Replace `supabase.from("stories").select("*").order("updated_at", { ascending: false })` with `apiClient.getStories()`
- `deleteStory` (line ~62): Replace `supabase.from("stories").delete().eq("id", id)` with `apiClient.deleteStory(id)`
- `duplicateStory` (line ~72-82): Replace `supabase.from("stories").insert(...)` with `apiClient.createStory(...)`
- `renameStory` (line ~93): Replace `supabase.from("stories").update({ title }).eq("id", id)` with `apiClient.updateStory(id, { title })`

- [ ] **Step 3: Migrate StoryNew.tsx**

In `src/pages/StoryNew.tsx`:
- Count check in `useEffect` (line ~53-61): Replace `supabase.from("stories").select("id", { count: "exact", head: true }).eq("user_id", user.id)` with `apiClient.getStoryCount()`
- Count check in `handleStart` (line ~80-82): Same replacement
- Story creation already goes through `createStory()` in `story-api.ts` which was migrated in Task 9

- [ ] **Step 4: Migrate StoryWrite.tsx**

In `src/pages/StoryWrite.tsx`:
- Choice update (line ~356): Replace `supabase.from("story_nodes").update({ choices }).eq("id", lastNodeId)` with `apiClient.updateNode(lastNodeId, { choices })`
- Share toggle (line ~589-591): Replace `supabase.from("stories").update({ share_token }).eq("id", storyId)` with `apiClient.updateStory(storyId, { share_token })`

- [ ] **Step 5: Migrate SharedStory.tsx**

In `src/pages/SharedStory.tsx`:
- `loadSharedStory` (line ~34-55): Replace both Supabase calls with single `apiClient.getSharedStory(token)`, then extract `story` and `nodes` from response

- [ ] **Step 6: Migrate EditableStoryCard.tsx**

Check if this component makes direct Supabase calls or if it delegates to Dashboard.tsx callbacks. If it has direct calls, replace them with `apiClient.*` calls.

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.tsx src/pages/Dashboard.tsx src/pages/StoryNew.tsx src/pages/StoryWrite.tsx src/pages/SharedStory.tsx src/components/dashboard/EditableStoryCard.tsx
git commit -m "refactor: migrate all frontend pages from Supabase DB to API client"
```

---

## Task 11: Migrate Existing API Routes

**Files:**
- Modify: `api/export-story.ts`
- Modify: `api/og-shared-story.ts`
- Modify: `api/check-subscription.ts`

These server-side routes currently use the Supabase admin client for DB queries. Replace with `_db.ts` queries.

- [ ] **Step 1: Migrate api/export-story.ts**

Read `api/export-story.ts` in full. Replace:
- Profile tier check (line ~31-34): `supabase.from("profiles").select("tier_override").eq("user_id", userId)` → `queryOne("SELECT tier_override FROM profiles WHERE user_id = $1", [userId])`
- Story fetch (line ~52-56): `supabase.from("stories").select("*").eq("id", storyId).eq("user_id", userId)` → `queryOne("SELECT * FROM stories WHERE id = $1 AND user_id = $2", [storyId, userId])`
- Nodes fetch (line ~61-66): `supabase.from("story_nodes").select(...)` → `query("SELECT text, chosen_option, chapter_title, starts_chapter FROM story_nodes WHERE story_id = $1 AND is_active = true ORDER BY created_at ASC", [storyId])`

Remove the Supabase admin client initialization.

- [ ] **Step 2: Migrate api/og-shared-story.ts**

Read `api/og-shared-story.ts` in full. Replace:
- Story fetch (line ~111-115): `supabase.from("stories").select("title, genre, premise").eq("share_token", token)` → `queryOne("SELECT title, genre, premise FROM stories WHERE share_token = $1", [token])`

Remove the Supabase client initialization.

- [ ] **Step 3: Migrate api/check-subscription.ts**

Read `api/check-subscription.ts` in full. Replace:
- Profile tier_override fetch (line ~40-44) → `queryOne("SELECT tier_override FROM profiles WHERE user_id = $1", [userId])`
- Profile tier sync updates (lines ~48-50, ~67-70, ~111-113) → use upsert to handle cases where profile row doesn't exist yet:
  ```sql
  INSERT INTO profiles (user_id, tier) VALUES ($1, $2)
  ON CONFLICT (user_id) DO UPDATE SET tier = EXCLUDED.tier
  ```

Keep the Stripe API calls unchanged.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add api/export-story.ts api/og-shared-story.ts api/check-subscription.ts
git commit -m "refactor: migrate server-side API routes from Supabase admin to direct Postgres"
```

---

## Task 12: Cleanup & Audit

**Files:**
- Various (audit for remaining `supabase.from()` calls)

- [ ] **Step 1: Search for remaining supabase.from() calls**

```bash
grep -rn "supabase\.from" src/ api/ --include="*.ts" --include="*.tsx"
```

There should be ZERO results. If any remain, migrate them.

- [ ] **Step 2: Verify supabase import is only used for auth**

Check that `supabase` is only imported where `supabase.auth.*` is needed:
- `src/lib/auth.tsx` — auth state management
- `src/lib/api-client.ts` — getting auth token for API calls
- `src/pages/Auth.tsx` — login/signup
- `src/pages/ResetPassword.tsx` — password reset
- `src/pages/Pricing.tsx` — getting session for Stripe
- `api/_lib/auth.ts` — JWT verification

- [ ] **Step 3: Run full build and existing tests**

```bash
npm run build
npm run test
```

Fix any type errors or test failures.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: cleanup remaining Supabase DB references, verify migration complete"
```

---

## Task 13: Environment Setup & Manual Verification

This task is done with the user, not autonomously.

- [ ] **Step 1: User provisions Droplet**

User creates a $6/mo Ubuntu 24.04 Droplet on DigitalOcean.

- [ ] **Step 2: User runs setup script**

```bash
scp scripts/setup-droplet.sh scripts/schema.sql root@<droplet-ip>:~/
ssh root@<droplet-ip> "bash ~/setup-droplet.sh '<strong-password>'"
```

The script outputs the `DATABASE_URL` connection string.

- [ ] **Step 3: Set DATABASE_URL in Vercel**

```bash
vercel env add DATABASE_URL  # paste the connection string
```

Also add to `.env.local` for local dev:
```
DATABASE_URL=postgresql://arcwrite_app:<password>@<droplet-ip>:5432/arcwrite?sslmode=require
```

- [ ] **Step 4: Test locally**

```bash
npm run dev
```

- Sign up / log in (should work, uses Supabase Auth)
- Create a story (should work, uses new API routes → DO Postgres)
- Write story content, make choices
- Share a story, view shared link
- Check story limit enforcement
- Test jump, split, merge, delete operations

- [ ] **Step 5: Deploy to Vercel**

```bash
vercel deploy --prod
```

- [ ] **Step 6: Verify live site**

Run through the same manual tests on the live site. Check:
- Auth flow (signup, login, session persistence)
- Story CRUD (create, list, edit title, delete)
- Story writing (generate sections, choices, AI features)
- Node operations (jump, split, merge, delete)
- Shared stories (share toggle, view shared link while logged in and logged out)
- Story limit enforcement (free tier)
- Export story
- OG tags on shared stories

- [ ] **Step 7: Keep Supabase project active**

Do NOT delete the Supabase project for at least 2 weeks. It's the rollback safety net.

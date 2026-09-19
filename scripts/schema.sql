-- Canonical bootstrap schema for Arcwrite (Neon Postgres).
-- Rebuilt 2026-09-19 from api/ code + docs/superpowers migration history
-- after the DigitalOcean droplet was retired. Apply to a fresh database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE profiles (
  user_id text PRIMARY KEY, -- Clerk user ID (e.g. "user_2abc...")
  tier text NOT NULL DEFAULT 'free',
  tier_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  genre text,
  tone text,
  premise text,
  status text NOT NULL DEFAULT 'in_progress',
  share_token text UNIQUE,
  target_turns integer DEFAULT 35,
  arc_override text,
  arc_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE story_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES story_nodes(id),
  text text NOT NULL DEFAULT '',
  summary text,
  choices jsonb,
  story_state jsonb,
  is_active boolean NOT NULL DEFAULT true,
  chosen_option jsonb,
  starts_chapter boolean NOT NULL DEFAULT false,
  chapter_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name text,
  is_main boolean NOT NULL DEFAULT false,
  fork_node_id uuid REFERENCES story_nodes(id) ON DELETE SET NULL,
  tip_node_id uuid REFERENCES story_nodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Added after branches exists (story_nodes <-> branches is circular).
ALTER TABLE story_nodes
  ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

CREATE TABLE chapter_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  chapter_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(node_id, branch_id)
);

CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_share_token ON stories(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_story_nodes_story_id ON story_nodes(story_id);
CREATE INDEX idx_story_nodes_parent_id ON story_nodes(parent_id);
CREATE INDEX idx_story_nodes_branch_id ON story_nodes(branch_id);
CREATE INDEX idx_branches_story_id ON branches(story_id);
CREATE INDEX idx_chapter_breaks_branch_id ON chapter_breaks(branch_id);

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

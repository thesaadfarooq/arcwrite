CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  tier text NOT NULL DEFAULT 'free',
  tier_override text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  genre text,
  tone text,
  premise text,
  status text NOT NULL DEFAULT 'in_progress',
  share_token text UNIQUE,
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

CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_share_token ON stories(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_story_nodes_story_id ON story_nodes(story_id);
CREATE INDEX idx_story_nodes_parent_id ON story_nodes(parent_id);

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

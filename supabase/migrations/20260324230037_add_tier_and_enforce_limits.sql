-- Add a synced tier column to profiles (updated by check-subscription API)
-- This enables server-side enforcement of plan limits via RLS and triggers.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Backfill: if tier_override is set, use it as the tier
UPDATE public.profiles SET tier = tier_override WHERE tier_override IS NOT NULL;

-- Function to enforce story count limits on INSERT
CREATE OR REPLACE FUNCTION public.enforce_story_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  user_tier TEXT;
  max_stories INTEGER;
BEGIN
  -- Get the user's tier from profiles
  SELECT COALESCE(tier_override, tier) INTO user_tier
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Determine limit based on tier
  IF user_tier = 'pro' THEN
    RETURN NEW;  -- unlimited
  ELSIF user_tier = 'plus' THEN
    max_stories := 15;
  ELSE
    max_stories := 2;  -- free tier
  END IF;

  -- Count existing stories
  SELECT COUNT(*) INTO current_count
  FROM public.stories
  WHERE user_id = NEW.user_id;

  IF current_count >= max_stories THEN
    RAISE EXCEPTION 'Story limit reached for your plan (% of %)', current_count, max_stories;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_story_limit_trigger
  BEFORE INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_story_limit();

-- Function to enforce chapter (active node) limits on INSERT
CREATE OR REPLACE FUNCTION public.enforce_chapter_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
  user_tier TEXT;
  story_owner UUID;
  max_chapters INTEGER;
BEGIN
  -- Get the story owner
  SELECT user_id INTO story_owner
  FROM public.stories
  WHERE id = NEW.story_id;

  -- Get the user's tier
  SELECT COALESCE(tier_override, tier) INTO user_tier
  FROM public.profiles
  WHERE user_id = story_owner;

  -- Determine limit
  IF user_tier = 'pro' THEN
    RETURN NEW;  -- unlimited
  ELSIF user_tier = 'plus' THEN
    max_chapters := 20;
  ELSE
    max_chapters := 5;  -- free tier
  END IF;

  -- Count active nodes in this story
  SELECT COUNT(*) INTO active_count
  FROM public.story_nodes
  WHERE story_id = NEW.story_id AND is_active = true;

  IF active_count >= max_chapters THEN
    RAISE EXCEPTION 'Chapter limit reached for your plan (% of %)', active_count, max_chapters;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_chapter_limit_trigger
  BEFORE INSERT ON public.story_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_chapter_limit();

-- Prevent non-Pro users from enabling sharing (setting share_token)
CREATE OR REPLACE FUNCTION public.enforce_sharing_tier()
RETURNS TRIGGER AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Only check when share_token is being set (not cleared)
  IF NEW.share_token IS NOT NULL AND (OLD.share_token IS NULL OR OLD.share_token != NEW.share_token) THEN
    SELECT COALESCE(tier_override, tier) INTO user_tier
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    IF user_tier != 'pro' THEN
      RAISE EXCEPTION 'Public sharing requires a Pro plan';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_sharing_tier_trigger
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sharing_tier();

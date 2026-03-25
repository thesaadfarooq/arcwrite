-- Update the node-limit trigger: Plus tier is now unlimited (like Pro),
-- free tier sections raised from 5 to 10, and the error message says "section"
-- instead of "chapter".
-- Also update story limit: Plus tier lowered from 15 to 10 stories.

CREATE OR REPLACE FUNCTION public.enforce_chapter_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
  user_tier TEXT;
  story_owner UUID;
  max_sections INTEGER;
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
  IF user_tier = 'pro' OR user_tier = 'plus' THEN
    RETURN NEW;  -- unlimited sections
  ELSE
    max_sections := 10;  -- free tier
  END IF;

  -- Count active nodes in this story
  SELECT COUNT(*) INTO active_count
  FROM public.story_nodes
  WHERE story_id = NEW.story_id AND is_active = true;

  IF active_count >= max_sections THEN
    RAISE EXCEPTION 'Turn limit reached for your plan (% of %)', active_count, max_sections;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update story limit: Plus tier from 15 to 10 stories
CREATE OR REPLACE FUNCTION public.enforce_story_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  user_tier TEXT;
  max_stories INTEGER;
BEGIN
  SELECT COALESCE(tier_override, tier) INTO user_tier
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF user_tier = 'pro' THEN
    RETURN NEW;  -- unlimited
  ELSIF user_tier = 'plus' THEN
    max_stories := 10;
  ELSE
    max_stories := 2;  -- free tier
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.stories
  WHERE user_id = NEW.user_id;

  IF current_count >= max_stories THEN
    RAISE EXCEPTION 'Story limit reached for your plan (% of %)', current_count, max_stories;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

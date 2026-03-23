ALTER TABLE public.story_nodes ADD COLUMN starts_chapter boolean NOT NULL DEFAULT false;

-- Backfill: root nodes and nodes without chosen_option start chapters
UPDATE public.story_nodes SET starts_chapter = true WHERE parent_id IS NULL OR chosen_option IS NULL;
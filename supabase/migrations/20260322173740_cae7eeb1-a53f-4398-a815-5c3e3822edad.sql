-- Add share_token to stories for public sharing
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT NULL;

-- Create index for share token lookups
CREATE INDEX IF NOT EXISTS idx_stories_share_token ON public.stories (share_token) WHERE share_token IS NOT NULL;

-- Allow public (unauthenticated) read access to stories via share_token
CREATE POLICY "Anyone can view shared stories"
ON public.stories
FOR SELECT
TO anon
USING (share_token IS NOT NULL);

-- Allow anon to read story_nodes for shared stories
CREATE POLICY "Anyone can view nodes of shared stories"
ON public.story_nodes
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM stories
  WHERE stories.id = story_nodes.story_id
  AND stories.share_token IS NOT NULL
));
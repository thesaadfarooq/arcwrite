-- Fix: authenticated users can also view shared stories (not just anon)
-- The original policies only granted access TO anon, so logged-in users
-- couldn't view other people's shared stories.

CREATE POLICY "Authenticated users can view shared stories"
ON public.stories
FOR SELECT
TO authenticated
USING (share_token IS NOT NULL);

CREATE POLICY "Authenticated users can view nodes of shared stories"
ON public.story_nodes
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM stories
  WHERE stories.id = story_nodes.story_id
  AND stories.share_token IS NOT NULL
));

-- Restrict profiles SELECT to own profile only.
-- Previously allowed all users to read all profiles (including tier/tier_override).
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

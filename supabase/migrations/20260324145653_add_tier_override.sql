-- Add tier_override column for testing/manual tier assignment
-- When set, check-subscription API returns this tier instead of checking Stripe
ALTER TABLE public.profiles ADD COLUMN tier_override TEXT DEFAULT NULL;

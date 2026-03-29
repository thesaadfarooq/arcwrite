import { createClient } from "@supabase/supabase-js";

// Module-level singleton — avoids creating a new client on every request
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
);

export type TierKey = "free" | "plus" | "pro";

/**
 * Validate a Bearer token from the Authorization header.
 * Returns the authenticated user or null.
 * Works in both Edge and Node.js runtimes.
 */
export async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

/**
 * Look up a user's subscription tier from the profiles table.
 * Falls back to "free" if no row exists or query fails.
 */
export async function getUserTier(userId: string): Promise<TierKey> {
  const { data } = await supabase
    .from("profiles")
    .select("tier")
    .eq("user_id", userId)
    .single();
  const tier = data?.tier;
  if (tier === "plus" || tier === "pro") return tier;
  return "free";
}

/** Standard 401 response for Edge runtime handlers */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Authentication required" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

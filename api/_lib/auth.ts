import { createClient } from "@supabase/supabase-js";

// Module-level singleton — avoids creating a new client on every request
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
);

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

/** Standard 401 response for Edge runtime handlers */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Authentication required" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

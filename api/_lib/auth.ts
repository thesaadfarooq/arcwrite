import { verifyToken, createClerkClient } from "@clerk/backend";

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

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return { id: payload.sub };
  } catch {
    return null;
  }
}

/**
 * Get the primary email address for a Clerk user.
 * Requires the user's Clerk ID.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const user = await clerk.users.getUser(userId);
  return user.emailAddresses?.[0]?.emailAddress ?? null;
}

/** Standard 401 response for Edge runtime handlers */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Authentication required" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

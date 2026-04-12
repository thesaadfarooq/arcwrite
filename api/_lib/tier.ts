import type { TierKey } from "./auth.js";
import { queryOne } from "../_db.js";

/**
 * Get the user's effective tier from the profiles table.
 * Falls back to "free" if no profile exists.
 * Requires Node.js runtime (uses pg via _db.js).
 */
export async function getUserTier(userId: string): Promise<TierKey> {
  const row = await queryOne<{ tier: string; tier_override: string | null }>(
    "SELECT tier, tier_override FROM profiles WHERE user_id = $1",
    [userId]
  );
  if (!row) return "free";
  const effective = row.tier_override || row.tier;
  if (effective === "plus" || effective === "pro") return effective;
  return "free";
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { query, queryOne } from "./_db.js";
import { getAuthenticatedUser, getUserEmail } from "./_lib/auth.js";

// Map tier names to Stripe product IDs — MUST be set via env vars per environment
const STRIPE_PLUS_PRODUCT_ID = process.env.STRIPE_PLUS_PRODUCT_ID;
const STRIPE_PRO_PRODUCT_ID = process.env.STRIPE_PRO_PRODUCT_ID;

const TIER_PRODUCT_MAP: Record<string, string | undefined> = {
  plus: STRIPE_PLUS_PRODUCT_ID,
  pro: STRIPE_PRO_PRODUCT_ID,
};

export const config = { runtime: "nodejs", maxDuration: 10 };

function getAuthorizationHeader(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  return typeof header === "string" ? header : null;
}

async function upsertProfileTier(userId: string, tier: string) {
  await query(
    `INSERT INTO profiles (user_id, tier) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET tier = EXCLUDED.tier`,
    [userId, tier]
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const user = await getAuthenticatedUser(getAuthorizationHeader(req));
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const userEmail = await getUserEmail(user.id);
    if (!userEmail) throw new Error("User email not available");

    // Check for tier override in profiles (for testing/manual assignment)
    const profile = await queryOne<{ tier_override: string | null }>(
      "SELECT tier_override FROM profiles WHERE user_id = $1",
      [user.id]
    );

    if (profile?.tier_override && TIER_PRODUCT_MAP[profile.tier_override]) {
      // Sync tier to profiles so DB triggers can enforce limits
      await upsertProfileTier(user.id, profile.tier_override);

      return res.json({
        subscribed: true,
        product_id: TIER_PRODUCT_MAP[profile.tier_override],
        subscription_end: null,
        cancel_at_period_end: false,
        tier_override: profile.tier_override,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      // Sync tier as free
      await upsertProfileTier(user.id, "free");

      return res.json({ subscribed: false });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let cancelAtPeriodEnd = false;

    // Determine tier from Stripe product ID
    let resolvedTier = "free";

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const item = subscription.items.data[0];
      const periodEnd = item.current_period_end ?? subscription.cancel_at;
      if (typeof periodEnd === "number") {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      } else if (typeof periodEnd === "string") {
        subscriptionEnd = periodEnd;
      }
      productId = item.price.product;
      cancelAtPeriodEnd = !!subscription.cancel_at_period_end;

      // Map product ID to tier name (only match if env vars are configured)
      if (STRIPE_PRO_PRODUCT_ID && productId === STRIPE_PRO_PRODUCT_ID) {
        resolvedTier = "pro";
      } else if (STRIPE_PLUS_PRODUCT_ID && productId === STRIPE_PLUS_PRODUCT_ID) {
        resolvedTier = "plus";
      }
    }

    // Sync resolved tier to profiles for DB-level enforcement
    await upsertProfileTier(user.id, resolvedTier);

    return res.json({ subscribed: hasActiveSub, product_id: productId, subscription_end: subscriptionEnd, cancel_at_period_end: cancelAtPeriodEnd });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Map tier_override values to their corresponding Stripe product IDs
const TIER_PRODUCT_MAP: Record<string, string> = {
  plus: process.env.STRIPE_PLUS_PRODUCT_ID || "prod_UCXxD7k8Xe3vRO",
  pro: process.env.STRIPE_PRO_PRODUCT_ID || "prod_UCXsdTxzZXQZ36",
};

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.authorization || "";
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Check for tier override in profiles (for testing/manual assignment)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tier_override")
      .eq("user_id", user.id)
      .single();

    if (profile?.tier_override && TIER_PRODUCT_MAP[profile.tier_override]) {
      // Sync tier to profiles so DB triggers can enforce limits
      await supabaseAdmin
        .from("profiles")
        .update({ tier: profile.tier_override })
        .eq("user_id", user.id);

      return res.json({
        subscribed: true,
        product_id: TIER_PRODUCT_MAP[profile.tier_override],
        subscription_end: null,
        cancel_at_period_end: false,
        tier_override: profile.tier_override,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      // Sync tier as free
      await supabaseAdmin
        .from("profiles")
        .update({ tier: "free" })
        .eq("user_id", user.id);

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
      const subscription = subscriptions.data[0] as any;
      const item = subscription.items.data[0];
      const periodEnd = item.current_period_end ?? subscription.cancel_at;
      if (typeof periodEnd === "number") {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      } else if (typeof periodEnd === "string") {
        subscriptionEnd = periodEnd;
      }
      productId = item.price.product;
      cancelAtPeriodEnd = !!subscription.cancel_at_period_end;

      // Map product ID to tier name
      if (productId === TIER_PRODUCT_MAP.pro) {
        resolvedTier = "pro";
      } else if (productId === TIER_PRODUCT_MAP.plus) {
        resolvedTier = "plus";
      }
    }

    // Sync resolved tier to profiles for DB-level enforcement
    await supabaseAdmin
      .from("profiles")
      .update({ tier: resolvedTier })
      .eq("user_id", user.id);

    return res.json({ subscribed: hasActiveSub, product_id: productId, subscription_end: subscriptionEnd, cancel_at_period_end: cancelAtPeriodEnd });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: msg });
  }
}

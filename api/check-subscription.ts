import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return Response.json({ subscribed: false });
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

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const periodEnd = subscription.current_period_end;
      try {
        if (typeof periodEnd === "number") {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        }
      } catch {
        subscriptionEnd = null;
      }
      productId = subscription.items.data[0].price.product;
    }

    return Response.json({ subscribed: hasActiveSub, product_id: productId, subscription_end: subscriptionEnd });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

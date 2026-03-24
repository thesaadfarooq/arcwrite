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
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user?.email) throw new Error("Authentication failed");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as any });
    const customers = await stripe.customers.list({ email: userData.user.email, limit: 1 });
    if (customers.data.length === 0) throw new Error("No Stripe customer found for this user");

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/dashboard`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

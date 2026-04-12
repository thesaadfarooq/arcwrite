import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { getAuthenticatedUser, getUserEmail } from "./_lib/auth.js";

export const config = { runtime: "nodejs", maxDuration: 10 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.authorization || "";
    if (!authHeader) throw new Error("No authorization header provided");

    const user = await getAuthenticatedUser(authHeader);
    if (!user) throw new Error("User not authenticated or email not available");

    const email = await getUserEmail(user.id);
    if (!email) throw new Error("User not authenticated or email not available");

    const { priceId, coupon } = req.body;
    if (!priceId) throw new Error("priceId is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion });
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const origin = (req.headers.origin as string) || "http://localhost:8080";
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    };
    if (typeof coupon === "string" && coupon.length > 0) {
      sessionParams.discounts = [{ coupon }];
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: msg });
  }
}

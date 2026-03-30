// Stripe product and price IDs — MUST be set via env vars per environment (sandbox vs live)
// No hardcoded fallbacks to prevent cross-environment contamination
export const TIERS = {
  free: {
    name: "Free",
    price: 0,
    price_id: null as string | null,
    product_id: null as string | null,
    limits: { stories: 2, turns: 10, export: false, sharing: false, customTone: false, arcOverrides: false },
  },
  plus: {
    name: "Plus",
    price: 9.99,
    price_id: import.meta.env.VITE_STRIPE_PLUS_PRICE_ID || null,
    product_id: import.meta.env.VITE_STRIPE_PLUS_PRODUCT_ID || null,
    limits: { stories: 10, turns: Infinity, export: true, sharing: false, customTone: true, arcOverrides: true },
  },
  pro: {
    name: "Pro",
    price: 15.99,
    price_id: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || null,
    product_id: import.meta.env.VITE_STRIPE_PRO_PRODUCT_ID || null,
    limits: { stories: Infinity, turns: Infinity, export: true, sharing: true, customTone: true, arcOverrides: true },
  },
};

export type TierKey = keyof typeof TIERS;

export function getTierByProductId(productId: string | null): TierKey {
  if (!productId) return "free";
  if (productId === TIERS.plus.product_id) return "plus";
  if (productId === TIERS.pro.product_id) return "pro";
  return "free";
}

export function getTierLimits(tier: TierKey) {
  return TIERS[tier].limits;
}

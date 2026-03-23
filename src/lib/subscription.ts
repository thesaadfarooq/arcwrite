// Stripe product and price IDs
export const TIERS = {
  free: {
    name: "Free",
    price: 0,
    price_id: null,
    product_id: null,
    limits: { stories: 2, chapters: 5, export: false, sharing: false },
  },
  plus: {
    name: "Plus",
    price: 9.99,
    price_id: "price_1TE8rWInpGHZDZbfw6nq5vUi",
    product_id: "prod_UCXxD7k8Xe3vRO",
    limits: { stories: 15, chapters: 20, export: true, sharing: false },
  },
  pro: {
    name: "Pro",
    price: 15.99,
    price_id: "price_1TE8mSDln8cBHnbWHnQv2nwK",
    product_id: "prod_UCXsdTxzZXQZ36",
    limits: { stories: Infinity, chapters: Infinity, export: true, sharing: true },
  },
} as const;

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

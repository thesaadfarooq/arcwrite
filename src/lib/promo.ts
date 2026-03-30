// Active promotion config — set to null to end the campaign
export const ACTIVE_PROMO: {
  couponId: string;
  label: string;
  discount: number;
  promoPrices: Record<string, number>;
} | null = {
  couponId: "YMV2ePf6",
  label: "Limited time — 50% off",
  discount: 50,
  promoPrices: { plus: 4.99, pro: 7.99 },
};

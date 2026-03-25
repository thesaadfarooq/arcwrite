import { describe, it, expect } from "vitest";
import { getTierByProductId, getTierLimits, TIERS } from "@/lib/subscription";

describe("subscription utilities", () => {
  describe("getTierByProductId", () => {
    it("returns 'free' for null product ID", () => {
      expect(getTierByProductId(null)).toBe("free");
    });

    it("returns 'free' for unknown product ID", () => {
      expect(getTierByProductId("prod_unknown")).toBe("free");
    });

    it("returns 'plus' for plus product ID", () => {
      expect(getTierByProductId(TIERS.plus.product_id!)).toBe("plus");
    });

    it("returns 'pro' for pro product ID", () => {
      expect(getTierByProductId(TIERS.pro.product_id!)).toBe("pro");
    });
  });

  describe("getTierLimits", () => {
    it("returns correct free tier limits", () => {
      const limits = getTierLimits("free");
      expect(limits.stories).toBe(2);
      expect(limits.turns).toBe(10);
      expect(limits.export).toBe(false);
      expect(limits.sharing).toBe(false);
    });

    it("returns correct plus tier limits", () => {
      const limits = getTierLimits("plus");
      expect(limits.stories).toBe(10);
      expect(limits.turns).toBe(Infinity);
      expect(limits.export).toBe(true);
      expect(limits.sharing).toBe(false);
    });

    it("returns correct pro tier limits", () => {
      const limits = getTierLimits("pro");
      expect(limits.stories).toBe(Infinity);
      expect(limits.turns).toBe(Infinity);
      expect(limits.export).toBe(true);
      expect(limits.sharing).toBe(true);
    });
  });

  describe("TIERS config", () => {
    it("free tier has no price_id", () => {
      expect(TIERS.free.price_id).toBeNull();
    });

    it("plus tier has a price_id", () => {
      expect(TIERS.plus.price_id).toBeTruthy();
      expect(TIERS.plus.price_id).toMatch(/^price_/);
    });

    it("pro tier has a price_id", () => {
      expect(TIERS.pro.price_id).toBeTruthy();
      expect(TIERS.pro.price_id).toMatch(/^price_/);
    });

    it("tier prices are ordered correctly", () => {
      expect(TIERS.free.price).toBe(0);
      expect(TIERS.plus.price).toBeLessThan(TIERS.pro.price);
    });
  });
});

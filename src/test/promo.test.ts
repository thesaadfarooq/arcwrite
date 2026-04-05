import { describe, expect, it } from "vitest";
import { ACTIVE_PROMO } from "@/lib/promo";

describe("promo config", () => {
  it("exports ACTIVE_PROMO with expected shape when active", () => {
    if (ACTIVE_PROMO === null) {
      // If no active promo, just verify it's null
      expect(ACTIVE_PROMO).toBeNull();
    } else {
      expect(ACTIVE_PROMO).toHaveProperty("couponId");
      expect(ACTIVE_PROMO).toHaveProperty("label");
      expect(ACTIVE_PROMO).toHaveProperty("discount");
      expect(ACTIVE_PROMO).toHaveProperty("promoPrices");
      expect(typeof ACTIVE_PROMO.couponId).toBe("string");
      expect(typeof ACTIVE_PROMO.label).toBe("string");
      expect(typeof ACTIVE_PROMO.discount).toBe("number");
      expect(typeof ACTIVE_PROMO.promoPrices).toBe("object");
    }
  });
});

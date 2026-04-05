import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/promo", () => ({
  ACTIVE_PROMO: {
    couponId: "TEST50",
    label: "50% off test",
    discount: 50,
    promoPrices: { plus: 4.99, pro: 7.99 },
  },
}));

describe("PromoBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders the promo banner with label", async () => {
    const { PromoBanner } = await import("@/components/PromoBanner");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PromoBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("50% off test")).toBeDefined();
  });

  it("shows See plans for free tier users", async () => {
    const { PromoBanner } = await import("@/components/PromoBanner");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PromoBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("See plans")).toBeDefined();
  });

  it("can be dismissed", async () => {
    const { PromoBanner } = await import("@/components/PromoBanner");
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <PromoBanner />
      </MemoryRouter>
    );
    expect(screen.getByText("50% off test")).toBeDefined();
    fireEvent.click(screen.getByLabelText("Dismiss promotion banner"));
    // After dismiss, the banner should be gone (component returns null)
    expect(container.querySelector("[class*='fixed']")).toBeNull();
  });

  it("does not render in the story editor", async () => {
    const { PromoBanner } = await import("@/components/PromoBanner");
    const { container } = render(
      <MemoryRouter initialEntries={["/story/abc-123"]}>
        <PromoBanner />
      </MemoryRouter>
    );
    expect(container.querySelector("[class*='fixed']")).toBeNull();
  });
});

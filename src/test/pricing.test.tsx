import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    tier: "free",
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    refreshSubscription: vi.fn(),
  }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

function renderPage(Page: React.ComponentType) {
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("Pricing page", () => {
  it("renders the page heading", async () => {
    const { default: Pricing } = await import("@/pages/Pricing");
    renderPage(Pricing);
    expect(screen.getByRole("heading", { name: /choose your plan/i })).toBeDefined();
  });

  it("renders all three tier cards", async () => {
    const { default: Pricing } = await import("@/pages/Pricing");
    renderPage(Pricing);
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plus").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
  });

  it("renders the feature comparison rows", async () => {
    const { default: Pricing } = await import("@/pages/Pricing");
    renderPage(Pricing);
    expect(screen.getAllByText("Stories").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/turns per story/i).length).toBeGreaterThan(0);
  });

  it("renders upgrade buttons for non-free tiers", async () => {
    const { default: Pricing } = await import("@/pages/Pricing");
    renderPage(Pricing);
    const upgradeButtons = screen.getAllByRole("button", { name: /upgrade/i });
    expect(upgradeButtons.length).toBe(2);
  });

  it("renders FAQ section", async () => {
    const { default: Pricing } = await import("@/pages/Pricing");
    renderPage(Pricing);
    expect(screen.getByText("Frequently asked questions")).toBeDefined();
    expect(screen.getByText(/can i try arcwrite for free/i)).toBeDefined();
  });

  it("renders every plan includes section", async () => {
    const { default: Pricing } = await import("@/pages/Pricing");
    renderPage(Pricing);
    expect(screen.getByText("Every plan includes")).toBeDefined();
    expect(screen.getByText("AI story generation")).toBeDefined();
  });
});

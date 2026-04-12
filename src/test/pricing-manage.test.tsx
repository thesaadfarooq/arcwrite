import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const mockGetToken = vi.fn();
const mockFetch = vi.fn();
const toastErrorMock = vi.fn();
const refreshSubscriptionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    tier: "plus",
    subscriptionEnd: "2025-12-31",
    cancelAtPeriodEnd: false,
    refreshSubscription: refreshSubscriptionMock,
    loading: false,
    getToken: (...args: unknown[]) => mockGetToken(...args),
  }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/promo", () => ({
  ACTIVE_PROMO: null,
}));

async function renderPricing() {
  const { default: Pricing } = await import("@/pages/Pricing");
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("Pricing manage subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("open", vi.fn());
  });

  it("shows Manage subscription button for current tier", async () => {
    await renderPricing();
    expect(screen.getByText("Manage subscription")).toBeDefined();
  });

  it("opens customer portal on Manage click", async () => {
    mockGetToken.mockResolvedValue("tok");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://billing.stripe.com/portal" }),
    });

    await renderPricing();
    fireEvent.click(screen.getByText("Manage subscription"));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/customer-portal",
      expect.objectContaining({ method: "POST" })
    ));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://billing.stripe.com/portal", "_blank"));
  });

  it("handles manage portal error", async () => {
    mockGetToken.mockResolvedValue("tok");
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Portal failed" }),
    });

    await renderPricing();
    fireEvent.click(screen.getByText("Manage subscription"));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Portal failed"));
  });

  it("shows Refresh subscription status button for paid tier", async () => {
    await renderPricing();
    expect(screen.getByText("Refresh subscription status")).toBeDefined();
  });

  it("calls refreshSubscription on Refresh click", async () => {
    await renderPricing();
    fireEvent.click(screen.getByText("Refresh subscription status"));
    expect(refreshSubscriptionMock).toHaveBeenCalled();
  });
});

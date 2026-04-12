import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const mockGetToken = vi.fn();
const mockFetch = vi.fn();
const toastErrorMock = vi.fn();
const navigateMock = vi.fn();
const refreshSubscriptionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    tier: "free",
    subscriptionEnd: null,
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

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

describe("Pricing page handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    // window.open mock
    vi.stubGlobal("open", vi.fn());
  });

  it("handles successful checkout", async () => {
    mockGetToken.mockResolvedValue("tok");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session" }),
    });

    await renderPricing();
    // Find the Upgrade button for Plus tier
    const upgradeButtons = screen.getAllByRole("button", { name: /upgrade/i });
    fireEvent.click(upgradeButtons[0]);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(window.open).toHaveBeenCalledWith("https://checkout.stripe.com/session", "_blank"));
  });

  it("handles checkout error", async () => {
    mockGetToken.mockResolvedValue("tok");
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Checkout failed" }),
    });

    await renderPricing();
    const upgradeButtons = screen.getAllByRole("button", { name: /upgrade/i });
    fireEvent.click(upgradeButtons[0]);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Checkout failed"));
  });

  it("handles checkout with JSON parse failure", async () => {
    mockGetToken.mockResolvedValue("tok");
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("bad json")),
    });

    await renderPricing();
    const upgradeButtons = screen.getAllByRole("button", { name: /upgrade/i });
    fireEvent.click(upgradeButtons[0]);

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Failed to start checkout"));
  });
});

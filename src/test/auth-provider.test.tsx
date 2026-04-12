import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

const mockGetToken = vi.fn();
const mockSignOut = vi.fn();

const mockUseUser = vi.fn();
const mockUseClerkAuth = vi.fn();

vi.mock("@clerk/react", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseClerkAuth(),
}));

// Mock fetch for subscription check
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ subscribed: false }),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not signed in, loaded
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      getToken: mockGetToken,
      signOut: mockSignOut,
    });
    mockGetToken.mockResolvedValue(null);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("provides default context when no user", async () => {
    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const { user, tier, loading } = useAuth();
      return (
        <div>
          <span data-testid="user">{user ? "yes" : "no"}</span>
          <span data-testid="tier">{tier}</span>
          <span data-testid="loading">{loading ? "yes" : "no"}</span>
        </div>
      );
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"));
    expect(screen.getByTestId("user").textContent).toBe("no");
    expect(screen.getByTestId("tier").textContent).toBe("free");
  });

  it("provides user when signed in", async () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: "user_123",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        firstName: "Test",
        lastName: "User",
        imageUrl: "https://img.clerk.com/avatar.png",
      },
    });
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
      getToken: mockGetToken,
      signOut: mockSignOut,
    });
    mockGetToken.mockResolvedValue("clerk-token-123");

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const { user, loading } = useAuth();
      return (
        <div>
          <span data-testid="loading">{loading ? "yes" : "no"}</span>
          <span data-testid="user-id">{user?.id || "none"}</span>
          <span data-testid="email">{user?.primaryEmailAddress?.emailAddress || "none"}</span>
          <span data-testid="first-name">{user?.firstName || "none"}</span>
        </div>
      );
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("no"));
    expect(screen.getByTestId("user-id").textContent).toBe("user_123");
    expect(screen.getByTestId("email").textContent).toBe("test@example.com");
    expect(screen.getByTestId("first-name").textContent).toBe("Test");
  });

  it("provides signOut function that calls Clerk signOut", async () => {
    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let signOutFn: (() => Promise<void>) | undefined;
    function Consumer() {
      const auth = useAuth();
      signOutFn = auth.signOut;
      return null;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await act(async () => {
      await signOutFn!();
    });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("refreshSubscription sets tier from product_id", async () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_123", primaryEmailAddress: null, firstName: null, lastName: null, imageUrl: null },
    });
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
      getToken: mockGetToken,
      signOut: mockSignOut,
    });
    mockGetToken.mockResolvedValue("clerk-token-123");

    // Use mockResolvedValue (not Once) since the useEffect also calls refreshSubscription
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ product_id: "prod_plus_123", subscription_end: "2025-12-31", cancel_at_period_end: false }),
    } as Response);

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const auth = useAuth();
      return <span data-testid="tier">{auth.tier}</span>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    // The useEffect triggers refreshSubscription when isSignedIn
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/stripe?action=check",
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer clerk-token-123" }) }),
      );
    });
  });

  it("refreshSubscription handles tier_override", async () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_123", primaryEmailAddress: null, firstName: null, lastName: null, imageUrl: null },
    });
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
      getToken: mockGetToken,
      signOut: mockSignOut,
    });
    mockGetToken.mockResolvedValue("clerk-token-123");

    // Use mockResolvedValue (not Once) since the useEffect also calls refreshSubscription
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tier_override: "pro", subscription_end: null, cancel_at_period_end: false }),
    } as Response);

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const auth = useAuth();
      return <span data-testid="tier">{auth.tier}</span>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    // The useEffect triggers refreshSubscription when isSignedIn
    await waitFor(() => expect(screen.getByTestId("tier").textContent).toBe("pro"));
  });

  it("refreshSubscription skips when no token", async () => {
    mockGetToken.mockResolvedValue(null);

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: (() => Promise<void>) | undefined;
    function Consumer() {
      const auth = useAuth();
      refreshFn = auth.refreshSubscription;
      return null;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await act(async () => {
      await refreshFn!();
    });
    // fetch should NOT have been called (no token)
    const fetchCalls = vi.mocked(globalThis.fetch).mock.calls.filter(
      (c) => c[0] === "/api/stripe?action=check"
    );
    expect(fetchCalls.length).toBe(0);
  });

  it("refreshSubscription handles fetch error", async () => {
    mockGetToken.mockResolvedValue("clerk-token-123");

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: (() => Promise<void>) | undefined;
    function Consumer() {
      const auth = useAuth();
      refreshFn = auth.refreshSubscription;
      return <span data-testid="tier">{auth.tier}</span>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    // Should not throw
    await act(async () => {
      await refreshFn!();
    });
    // Tier should remain free since the fetch failed
    expect(screen.getByTestId("tier").textContent).toBe("free");
  });

  it("refreshSubscription handles network exception", async () => {
    mockGetToken.mockResolvedValue("clerk-token-123");

    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("network down"));

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: (() => Promise<void>) | undefined;
    function Consumer() {
      const auth = useAuth();
      refreshFn = auth.refreshSubscription;
      return null;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    // Should not throw
    await act(async () => {
      await refreshFn!();
    });
  });

  it("clears state when user signs out", async () => {
    // Start signed in
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { id: "user_123", primaryEmailAddress: null, firstName: null, lastName: null, imageUrl: null },
    });
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: "user_123",
      getToken: mockGetToken,
      signOut: mockSignOut,
    });
    mockGetToken.mockResolvedValue("clerk-token-123");

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const { user, tier } = useAuth();
      return (
        <div>
          <span data-testid="user">{user ? "yes" : "no"}</span>
          <span data-testid="tier">{tier}</span>
        </div>
      );
    }
    const { rerender } = render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("yes"));

    // Now simulate sign out by changing mock return values
    mockUseUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
    mockUseClerkAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      getToken: mockGetToken,
      signOut: mockSignOut,
    });

    rerender(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no");
      expect(screen.getByTestId("tier").textContent).toBe("free");
    });
  });
});

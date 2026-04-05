import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

// Store the callback so we can trigger it
let authCallback: any = null;

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn().mockImplementation((cb: any) => {
  authCallback = cb;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

const getProfileMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => onAuthStateChangeMock(...args),
      getSession: (...args: any[]) => getSessionMock(...args),
      refreshSession: (...args: any[]) => refreshSessionMock(...args),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getProfile: (...args: any[]) => getProfileMock(...args),
  },
}));

// Mock fetch for subscription check
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ subscribed: false }),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
    getSessionMock.mockResolvedValue({ data: { session: null } });
    refreshSessionMock.mockResolvedValue({ data: { session: null } });
    getProfileMock.mockResolvedValue({ display_name: "Tester", avatar_url: null });
  });

  it("provides default context when no session", async () => {
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
    // After initial load, user should be null
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("no"));
    expect(screen.getByTestId("tier").textContent).toBe("free");
  });

  it("sets user on auth state change", async () => {
    const mockUser = { id: "u1", email: "test@example.com" };
    const mockSession = { user: mockUser, access_token: "tok" };
    getSessionMock.mockResolvedValue({ data: { session: mockSession } });

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const { user } = useAuth();
      return <span data-testid="email">{user?.email || "none"}</span>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // Trigger auth state change
    if (authCallback) {
      await act(async () => {
        authCallback("SIGNED_IN", mockSession);
      });
    }

    await waitFor(() => expect(screen.getByTestId("email").textContent).toBe("test@example.com"));
  });

  it("refreshes session when getSession returns null", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    refreshSessionMock.mockResolvedValue({ data: { session: { user: { id: "u2", email: "refreshed@example.com" }, access_token: "tok2" } } });

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const { user } = useAuth();
      return <span data-testid="email">{user?.email || "none"}</span>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(refreshSessionMock).toHaveBeenCalled());
  });

  it("provides signOut function", async () => {
    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let signOutFn: any;
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
      await signOutFn();
    });
    // signOut should have been called on supabase
  });

  it("provides refreshSubscription function", async () => {
    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: any;
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
      await refreshFn();
    });
  });

  it("refreshSubscription sets tier from product_id", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok" } },
    });
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ product_id: "prod_plus_123", subscription_end: "2025-12-31", cancel_at_period_end: false }),
    });

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: any;
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
    await act(async () => {
      await refreshFn();
    });
    // fetch should have been called with the subscription endpoint
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/check-subscription",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) }),
    );
  });

  it("refreshSubscription handles tier_override", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok" } },
    });
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tier_override: "pro", subscription_end: null, cancel_at_period_end: false }),
    });

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: any;
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
    await act(async () => {
      await refreshFn();
    });
    await waitFor(() => expect(screen.getByTestId("tier").textContent).toBe("pro"));
  });

  it("refreshSubscription skips when no session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: any;
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
      await refreshFn();
    });
    // fetch should NOT have been called (no session)
    const fetchCalls = (globalThis.fetch as any).mock.calls.filter(
      (c: any[]) => c[0] === "/api/check-subscription"
    );
    expect(fetchCalls.length).toBe(0);
  });

  it("refreshSubscription handles fetch error", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok" } },
    });
    (globalThis.fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: any;
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
      await refreshFn();
    });
    // Tier should remain free since the fetch failed
    expect(screen.getByTestId("tier").textContent).toBe("free");
  });

  it("refreshSubscription handles network exception", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok" } },
    });
    (globalThis.fetch as any).mockRejectedValueOnce(new Error("network down"));

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    let refreshFn: any;
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
      await refreshFn();
    });
  });

  it("sets profile to null when getProfile fails", async () => {
    const mockUser = { id: "u1", email: "test@example.com" };
    const mockSession = { user: mockUser, access_token: "tok" };
    getSessionMock.mockResolvedValue({ data: { session: mockSession } });
    getProfileMock.mockRejectedValue(new Error("profile fetch failed"));

    const { AuthProvider, useAuth } = await import("@/lib/auth");
    function Consumer() {
      const { profile } = useAuth();
      return <span data-testid="profile">{profile ? "has" : "null"}</span>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // Trigger auth state change with a session
    if (authCallback) {
      await act(async () => {
        authCallback("SIGNED_IN", mockSession);
      });
    }

    // Wait for the setTimeout(0) to run and fail
    await waitFor(() => expect(getProfileMock).toHaveBeenCalled());
    // Profile should be null after error
    await waitFor(() => expect(screen.getByTestId("profile").textContent).toBe("null"));
  });

  it("clears state when session is null in auth callback", async () => {
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
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    // Trigger signed out
    if (authCallback) {
      await act(async () => {
        authCallback("SIGNED_OUT", null);
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no");
      expect(screen.getByTestId("tier").textContent).toBe("free");
    });
  });
});

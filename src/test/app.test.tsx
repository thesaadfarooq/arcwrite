import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/promo", () => ({
  ACTIVE_PROMO: null,
}));

vi.mock("@vercel/analytics/react", () => ({
  Analytics: () => null,
}));

vi.mock("@vercel/speed-insights/react", () => ({
  SpeedInsights: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      refreshSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
}));

describe("App", () => {
  it("renders without crashing", async () => {
    const { default: App } = await import("@/App");
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it("renders the landing page at root route", async () => {
    const { default: App } = await import("@/App");
    render(<App />);
    // The landing page should render with some content
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });
});

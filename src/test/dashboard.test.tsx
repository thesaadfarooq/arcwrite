import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

const getStoriesMock = vi.fn();
const deleteStoryMock = vi.fn();
const createStoryMock = vi.fn();
const updateStoryMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1" },
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

vi.mock("@/components/UserMenu", () => ({
  UserMenu: () => null,
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getStories: (...args: unknown[]) => getStoriesMock(...args),
    deleteStory: (...args: unknown[]) => deleteStoryMock(...args),
    createStory: (...args: unknown[]) => createStoryMock(...args),
    updateStory: (...args: unknown[]) => updateStoryMock(...args),
  },
}));

function renderDashboard(Dashboard: React.ComponentType) {
  render(
    <MemoryRouter>
      <TooltipProvider>
        <Dashboard />
      </TooltipProvider>
    </MemoryRouter>
  );
}

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoriesMock.mockResolvedValue([]);
  });

  it("renders the page heading", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderDashboard(Dashboard);
    await waitFor(() => expect(screen.getByText("Your Stories")).toBeDefined());
  });

  it("shows empty state when no stories", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderDashboard(Dashboard);
    await waitFor(() => expect(screen.getByText("No stories yet")).toBeDefined());
  });

  it("renders story cards when stories exist", async () => {
    getStoriesMock.mockResolvedValue([
      { id: "s1", title: "Adventure", genre: "Fantasy", tone: null, status: "in_progress", created_at: "2026-01-01", updated_at: "2026-03-15", premise: null },
    ]);
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderDashboard(Dashboard);
    await waitFor(() => expect(screen.getByText("Adventure")).toBeDefined());
    expect(screen.getByText(/1 story/)).toBeDefined();
  });

  it("shows New Story button", async () => {
    const { default: Dashboard } = await import("@/pages/Dashboard");
    renderDashboard(Dashboard);
    await waitFor(() => expect(screen.getByText("New Story")).toBeDefined());
  });
});

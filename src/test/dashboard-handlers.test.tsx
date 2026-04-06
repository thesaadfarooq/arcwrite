import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockGetStories = vi.fn();
const mockDeleteStory = vi.fn();
const mockCreateStory = vi.fn();
const mockUpdateStory = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const refreshSubscriptionMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "test@test.com" },
    profile: { display_name: "Tester" },
    tier: "free",
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    signOut: vi.fn(),
    refreshSubscription: refreshSubscriptionMock,
    loading: false,
  }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getStories: (...args: unknown[]) => mockGetStories(...args),
    deleteStory: (...args: unknown[]) => mockDeleteStory(...args),
    createStory: (...args: unknown[]) => mockCreateStory(...args),
    updateStory: (...args: unknown[]) => mockUpdateStory(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const stories = [
  { id: "s1", title: "Story One", genre: "Fantasy", tone: "Epic", status: "in_progress", created_at: "2024-01-01", updated_at: "2024-01-02", premise: "A premise" },
  { id: "s2", title: "Story Two", genre: "Sci-Fi", tone: null, status: "draft", created_at: "2024-01-01", updated_at: "2024-01-02", premise: null },
];

async function renderDashboard() {
  mockGetStories.mockResolvedValue(stories);
  const { default: Dashboard } = await import("@/pages/Dashboard");
  render(
    <MemoryRouter>
      <TooltipProvider>
        <Dashboard />
      </TooltipProvider>
    </MemoryRouter>
  );
  await waitFor(() => expect(mockGetStories).toHaveBeenCalled());
}

describe("Dashboard handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders stories", async () => {
    await renderDashboard();
    expect(screen.getByText("Story One")).toBeDefined();
    expect(screen.getByText("Story Two")).toBeDefined();
    expect(screen.getByText("In Progress")).toBeDefined();
    expect(screen.getByText("Draft")).toBeDefined();
  });

  it("handles fetch stories error", async () => {
    mockGetStories.mockRejectedValue(new Error("network error"));
    const { default: Dashboard } = await import("@/pages/Dashboard");
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Dashboard />
        </TooltipProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Failed to load stories"));
  });

  it("shows empty state when no stories", async () => {
    mockGetStories.mockResolvedValue([]);
    const { default: Dashboard } = await import("@/pages/Dashboard");
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Dashboard />
        </TooltipProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("No stories yet")).toBeDefined());
  });

  it("renders story count", async () => {
    await renderDashboard();
    expect(screen.getAllByText(/2 stories/).length).toBeGreaterThan(0);
  });

  it("renders user name", async () => {
    await renderDashboard();
    expect(screen.getByText("Tester")).toBeDefined();
  });

  it("shows checkout success toast when URL param present", async () => {
    mockGetStories.mockResolvedValue([]);
    // Simulate ?checkout=success
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?checkout=success", pathname: "/dashboard" },
      writable: true,
    });
    const replaceStateSpy = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    const { default: Dashboard } = await import("@/pages/Dashboard");
    render(
      <MemoryRouter>
        <TooltipProvider>
          <Dashboard />
        </TooltipProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Subscription activated! Refreshing your plan…"));
    expect(refreshSubscriptionMock).toHaveBeenCalled();
    replaceStateSpy.mockRestore();
    // Reset location
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "", pathname: "/dashboard" },
      writable: true,
    });
  });
});

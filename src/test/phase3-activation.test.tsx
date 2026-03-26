import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import StoryNew from "@/pages/StoryNew";
import SharedStory from "@/pages/SharedStory";

let mockUser: { id: string } | null = { id: "user-1" };
let mockDashboardStories: Array<Record<string, unknown>> = [];
let mockStoryCount = 0;
let mockSharedStory: Record<string, unknown> | null = null;
let mockSharedNodes: Array<{ text: string; chosen_option: string | null }> = [];
const { apiClientMock } = vi.hoisted(() => ({
  apiClientMock: {
    getStories: vi.fn(),
    getStoryCount: vi.fn(),
    getSharedStory: vi.fn(),
  },
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    profile: null,
    tier: "free",
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    signOut: vi.fn(),
    refreshSubscription: vi.fn(),
  }),
}));

vi.mock("@/components/dashboard/EditableStoryCard", () => ({
  StoryGridCard: () => null,
  StoryListCard: () => null,
}));

vi.mock("@/components/SEO", () => ({
  default: () => null,
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: apiClientMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: mockUser
            ? {
                access_token: "test-token",
                user: mockUser,
              }
            : null,
        },
      })),
    },
  },
}));

describe("phase 3 activation polish", () => {
  beforeEach(() => {
    mockUser = { id: "user-1" };
    mockDashboardStories = [];
    mockStoryCount = 0;
    mockSharedStory = null;
    mockSharedNodes = [];
    apiClientMock.getStories.mockResolvedValue(mockDashboardStories);
    apiClientMock.getStoryCount.mockResolvedValue(mockStoryCount);
    apiClientMock.getSharedStory.mockImplementation(async () => {
      if (!mockSharedStory) {
        throw new Error("Story not found");
      }

      return {
        story: mockSharedStory,
        nodes: mockSharedNodes,
      };
    });
  });

  it("shows genre and surprise entry points on the landing page", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );

    expect(screen.getAllByRole("button", { name: /pick a genre/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /surprise me/i }).length).toBeGreaterThan(0);
  });

  it("shows multiple quick-start options in the empty dashboard state", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /write from scratch/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /pick a genre/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /surprise me/i })).toBeInTheDocument();
  });

  it("lets users prefill the premise from a starter prompt", async () => {
    render(
      <MemoryRouter initialEntries={["/story/new"]}>
        <Routes>
          <Route path="/story/new" element={<StoryNew />} />
        </Routes>
      </MemoryRouter>
    );

    const starterButtons = await screen.findAllByRole("button", { name: /try this starter/i });
    fireEvent.click(starterButtons[0]);

    const textarea = screen.getByPlaceholderText(/a retired astronaut discovers/i) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/astronaut|signal|star system/i);
  });

  it("adds strong creation CTAs to shared story pages", async () => {
    mockSharedStory = {
      id: "story-1",
      title: "The Last Lantern",
      genre: "fantasy",
    };
    mockSharedNodes = [
      { text: "The road bent toward the tower.", chosen_option: null },
    ];

    render(
      <MemoryRouter initialEntries={["/s/token-123"]}>
        <Routes>
          <Route path="/s/:token" element={<SharedStory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create your own story/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /start a fantasy story/i })).toBeInTheDocument();
  });

  it("offers a creation path when a shared story link fails", async () => {
    mockSharedStory = null;

    render(
      <MemoryRouter initialEntries={["/s/missing-token"]}>
        <Routes>
          <Route path="/s/:token" element={<SharedStory />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create your own story/i })).toBeInTheDocument();
    });
  });
});

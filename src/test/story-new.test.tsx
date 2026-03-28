import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import StoryNew from "@/pages/StoryNew";

const { navigateMock, createStoryMock, getStoryCountMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  createStoryMock: vi.fn(),
  getStoryCountMock: vi.fn(),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    tier: "free",
  }),
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getStoryCount: getStoryCountMock,
  },
}));

vi.mock("@/lib/story-api", () => ({
  createStory: createStoryMock,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("StoryNew", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoryCountMock.mockResolvedValue(0);
    createStoryMock.mockResolvedValue({ id: "story-1" });
  });

  it("defaults to medium length and lets custom tone override the preset tone", async () => {
    render(
      <MemoryRouter initialEntries={["/story/new"]}>
        <Routes>
          <Route path="/story/new" element={<StoryNew />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/a retired astronaut discovers/i), {
      target: { value: "A ship arrives with a warning nobody believes." },
    });
    fireEvent.click(screen.getByRole("button", { name: /choose tone/i }));

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /medium/i })).toBeChecked();
    });

    fireEvent.click(screen.getByRole("button", { name: /dark & gritty/i }));
    fireEvent.change(screen.getByPlaceholderText(/custom tone/i), {
      target: { value: "Hopeful but tense" },
    });
    fireEvent.click(screen.getByRole("button", { name: /begin writing/i }));

    await waitFor(() => {
      expect(createStoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: "Hopeful but tense",
          targetTurns: 35,
        }),
      );
    });
  });
});

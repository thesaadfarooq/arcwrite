import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/promo", () => ({
  ACTIVE_PROMO: null,
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

describe("Index (landing) page", () => {
  it("renders the main hero heading", async () => {
    const { default: Index } = await import("@/pages/Index");
    renderPage(Index);
    expect(screen.getByText(/you direct the story/i)).toBeDefined();
  });

  it("renders the start your story CTA", async () => {
    const { default: Index } = await import("@/pages/Index");
    renderPage(Index);
    expect(screen.getByRole("button", { name: /start your story/i })).toBeDefined();
  });

  it("renders feature highlights", async () => {
    const { default: Index } = await import("@/pages/Index");
    renderPage(Index);
    // The index page has feature cards
    expect(screen.getAllByText(/ai/i).length).toBeGreaterThan(0);
  });

  it("renders the footer", async () => {
    const { default: Index } = await import("@/pages/Index");
    renderPage(Index);
    expect(screen.getAllByText(/silvergrain/i).length).toBeGreaterThan(0);
  });
});

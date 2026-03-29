import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// Mock useAuth
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

// Mock useTheme
vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light" as const, toggleTheme: vi.fn() }),
}));

import Index from "@/pages/Index";

function renderLanding() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Landing page CTAs", () => {
  it("renders 'Start writing' button", () => {
    renderLanding();
    expect(screen.getByRole("button", { name: /start writing/i })).toBeInTheDocument();
  });

  it("does NOT render 'View plans' button", () => {
    renderLanding();
    expect(screen.queryByRole("button", { name: /view plans/i })).not.toBeInTheDocument();
  });

  it("does NOT render genre quick-start buttons", () => {
    renderLanding();
    expect(screen.queryByRole("button", { name: /fantasy quest/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mystery case/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sci-fi/i })).not.toBeInTheDocument();
  });

  it("renders 'Get started' button", () => {
    renderLanding();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });
});

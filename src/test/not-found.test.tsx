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

function renderPage(Page: React.ComponentType) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/missing-page"]}>
        <Page />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("NotFound page", () => {
  it("renders the 404 heading", async () => {
    const { default: NotFound } = await import("@/pages/NotFound");
    renderPage(NotFound);
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getByText(/this page doesn't exist/i)).toBeDefined();
  });

  it("shows the attempted path", async () => {
    const { default: NotFound } = await import("@/pages/NotFound");
    renderPage(NotFound);
    expect(screen.getByText("/missing-page")).toBeDefined();
  });

  it("renders Go back and Home buttons", async () => {
    const { default: NotFound } = await import("@/pages/NotFound");
    renderPage(NotFound);
    expect(screen.getByRole("button", { name: /go back/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /home/i })).toBeDefined();
  });

  it("shows navigation links for unauthenticated users", async () => {
    const { default: NotFound } = await import("@/pages/NotFound");
    renderPage(NotFound);
    expect(screen.getAllByText("Features").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pricing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
  });
});

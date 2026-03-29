import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

function renderAbout(About: React.ComponentType) {
  render(
    <HelmetProvider>
      <MemoryRouter>
        <About />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("About page", () => {
  it("renders heading and mentions Silvergrain", async () => {
    const { default: About } = await import("@/pages/About");
    renderAbout(About);
    expect(screen.getByRole("heading", { name: /about arcwrite/i })).toBeDefined();
    expect(screen.getAllByText(/silvergrain/i).length).toBeGreaterThan(0);
  });

  it("mentions interactive fiction", async () => {
    const { default: About } = await import("@/pages/About");
    renderAbout(About);
    expect(screen.getByText(/interactive fiction/i)).toBeDefined();
  });
});

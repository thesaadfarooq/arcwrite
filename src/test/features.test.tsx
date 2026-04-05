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
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("Features page", () => {
  it("renders the hero heading", async () => {
    const { default: Features } = await import("@/pages/Features");
    renderPage(Features);
    expect(screen.getByRole("heading", { name: /everything you need/i })).toBeDefined();
  });

  it("renders all six feature cards", async () => {
    const { default: Features } = await import("@/pages/Features");
    renderPage(Features);
    expect(screen.getByText("AI-Powered Prose")).toBeDefined();
    expect(screen.getByText("Branching Choices")).toBeDefined();
    expect(screen.getByText("Genre & Tone")).toBeDefined();
    expect(screen.getByText("Story Tree")).toBeDefined();
    expect(screen.getByText("PDF Export")).toBeDefined();
    expect(screen.getByText("Public Sharing")).toBeDefined();
  });

  it("renders the how it works section", async () => {
    const { default: Features } = await import("@/pages/Features");
    renderPage(Features);
    expect(screen.getByText("How it works")).toBeDefined();
    expect(screen.getByText("Describe your idea")).toBeDefined();
    expect(screen.getByText("Make choices")).toBeDefined();
    expect(screen.getByText("AI writes the prose")).toBeDefined();
  });

  it("renders the CTA button", async () => {
    const { default: Features } = await import("@/pages/Features");
    renderPage(Features);
    expect(screen.getByRole("button", { name: /get started/i })).toBeDefined();
  });
});

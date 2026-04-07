import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

function renderGenre(genre: string, Page: React.ComponentType) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/genres/${genre}`]}>
        <Routes>
          <Route path="/genres/:genre" element={<Page />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("GenreLanding page", () => {
  it("renders the fantasy genre page", async () => {
    const { default: GenreLanding } = await import("@/pages/GenreLanding");
    renderGenre("fantasy", GenreLanding);
    expect(screen.getByText(/write your own fantasy adventure/i)).toBeDefined();
    expect(screen.getByText("More story ideas")).toBeDefined();
  });

  it("renders the scifi genre page", async () => {
    const { default: GenreLanding } = await import("@/pages/GenreLanding");
    renderGenre("scifi", GenreLanding);
    expect(screen.getByText(/build futuristic sci-fi narratives/i)).toBeDefined();
  });

  it("renders the mystery genre page", async () => {
    const { default: GenreLanding } = await import("@/pages/GenreLanding");
    renderGenre("mystery", GenreLanding);
    expect(screen.getByText(/craft mysteries worth solving/i)).toBeDefined();
  });

  it("renders 404 for an invalid genre", async () => {
    const { default: GenreLanding } = await import("@/pages/GenreLanding");
    renderGenre("invalid-genre", GenreLanding);
    expect(screen.getByText("404")).toBeDefined();
    expect(screen.getByText("Genre not found")).toBeDefined();
  });

  it("renders the CTA button for a valid genre", async () => {
    const { default: GenreLanding } = await import("@/pages/GenreLanding");
    renderGenre("horror", GenreLanding);
    expect(screen.getByRole("button", { name: /begin writing/i })).toBeDefined();
  });
});

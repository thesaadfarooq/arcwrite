import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

// Mock useAuth
const mockUser = { id: "user-1", email: "test@example.com" };
let authReturn: { user: typeof mockUser | null; loading: boolean } = {
  user: null,
  loading: false,
};

vi.mock("@/lib/auth", () => ({
  useAuth: () => authReturn,
}));

// Mock useTheme
vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light" as const, toggleTheme: vi.fn() }),
}));

function renderNavbar(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Navbar />
    </MemoryRouter>,
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    authReturn = { user: null, loading: false };
  });

  it("renders logo linking to /", () => {
    renderNavbar();
    const logoLink = screen.getByRole("link", { name: /arcwrite/i });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("renders navigation links with correct hrefs", () => {
    renderNavbar();
    const features = screen.getByRole("link", { name: /^features$/i });
    const pricing = screen.getByRole("link", { name: /^pricing$/i });
    const about = screen.getByRole("link", { name: /^about$/i });
    const contact = screen.getByRole("link", { name: /^contact$/i });

    expect(features).toHaveAttribute("href", "/features");
    expect(pricing).toHaveAttribute("href", "/pricing");
    expect(about).toHaveAttribute("href", "/about");
    expect(contact).toHaveAttribute("href", "/contact");
  });

  it("shows sign in button for guests", () => {
    authReturn = { user: null, loading: false };
    renderNavbar();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows dashboard button for logged-in users", () => {
    authReturn = { user: mockUser, loading: false };
    renderNavbar();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    renderNavbar();
    const toggles = screen.getAllByRole("button", { name: /toggle theme/i });
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });
});

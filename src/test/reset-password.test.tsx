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

vi.mock("@clerk/react", () => ({
  useUser: () => ({ user: { updatePassword: vi.fn() } }),
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

describe("ResetPassword page", () => {
  it("renders the password reset form", async () => {
    const { default: ResetPassword } = await import("@/pages/ResetPassword");
    renderPage(ResetPassword);
    expect(screen.getByText("Set your new password")).toBeDefined();
    expect(screen.getByLabelText("New Password")).toBeDefined();
    expect(screen.getByRole("button", { name: /update password/i })).toBeDefined();
  });

  it("renders the Arcwrite branding", async () => {
    const { default: ResetPassword } = await import("@/pages/ResetPassword");
    renderPage(ResetPassword);
    expect(screen.getAllByText("Arcwrite").length).toBeGreaterThan(0);
  });
});

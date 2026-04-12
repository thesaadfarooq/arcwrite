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
  useSignIn: () => ({ signIn: null, errors: null, fetchStatus: "idle" }),
  useSignUp: () => ({ signUp: null, errors: null, fetchStatus: "idle" }),
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

describe("Auth page", () => {
  it("renders the login form by default", async () => {
    const { default: AuthPage } = await import("@/pages/Auth");
    renderPage(AuthPage);
    expect(screen.getByText("Welcome back")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined();
  });

  it("renders the Google sign-in button", async () => {
    const { default: AuthPage } = await import("@/pages/Auth");
    renderPage(AuthPage);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeDefined();
  });

  it("shows Forgot password and Sign up links", async () => {
    const { default: AuthPage } = await import("@/pages/Auth");
    renderPage(AuthPage);
    expect(screen.getByText("Forgot password?")).toBeDefined();
    expect(screen.getByText("Sign up")).toBeDefined();
  });

  it("switches to signup mode", async () => {
    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");
    renderPage(AuthPage);
    fireEvent.click(screen.getByText("Sign up"));
    expect(screen.getByText("Create your account")).toBeDefined();
    expect(screen.getByLabelText("Confirm password")).toBeDefined();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDefined();
  });

  it("switches to forgot password mode", async () => {
    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");
    renderPage(AuthPage);
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(screen.getByText("Reset your password")).toBeDefined();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeDefined();
  });

  it("renders copyright notice", async () => {
    const { default: AuthPage } = await import("@/pages/Auth");
    renderPage(AuthPage);
    expect(screen.getByText(/silvergrain/i)).toBeDefined();
  });
});

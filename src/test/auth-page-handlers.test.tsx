import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import userEvent from "@testing-library/user-event";

const signInMock = vi.fn();
const signUpMock = vi.fn();
const resetPasswordMock = vi.fn();
const signInOAuthMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: signInMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordMock,
      signInWithOAuth: signInOAuthMock,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

async function renderAuth() {
  const { default: AuthPage } = await import("@/pages/Auth");
  render(
    <HelmetProvider>
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe("Auth page handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles successful login", async () => {
    signInMock.mockResolvedValue({ error: null });
    await renderAuth();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    }));
  });

  it("shows error for invalid login credentials", async () => {
    signInMock.mockResolvedValue({ error: new Error("Invalid login credentials") });
    await renderAuth();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(
      "Incorrect email or password. Please try again."
    ));
  });

  it("handles signup with password mismatch", async () => {
    await renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Different1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Passwords do not match."));
  });

  it("handles signup with short password", async () => {
    await renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Pa1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Pa1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(
      "Password must be at least 8 characters."
    ));
  });

  it("handles signup with missing uppercase/number", async () => {
    await renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "alllowercase" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "alllowercase" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(
      "Password must include uppercase, lowercase, and a number."
    ));
  });

  it("handles successful signup", async () => {
    signUpMock.mockResolvedValue({ error: null });
    await renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "GoodPass1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "GoodPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith(
      "Check your email to verify your account"
    ));
  });

  it("handles already registered error on signup", async () => {
    signUpMock.mockResolvedValue({ error: new Error("User already registered") });
    await renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "existing@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "GoodPass1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "GoodPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(
      "An account with this email already exists. Try signing in instead."
    ));
  });

  it("handles forgot password flow", async () => {
    resetPasswordMock.mockResolvedValue({ error: null });
    await renderAuth();
    fireEvent.click(screen.getByText("Forgot password?"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "forgot@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => expect(resetPasswordMock).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith(
      "Check your email for reset instructions"
    ));
  });

  it("handles Google OAuth", async () => {
    signInOAuthMock.mockResolvedValue({ error: null });
    await renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(signInOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    ));
  });

  it("handles Google OAuth error", async () => {
    signInOAuthMock.mockResolvedValue({ error: new Error("OAuth failed") });
    await renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("OAuth failed"));
  });
});

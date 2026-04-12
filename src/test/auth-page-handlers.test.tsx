import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const passwordMock = vi.fn();
const ssoMock = vi.fn();
const signInCreateMock = vi.fn();
const sendResetCodeMock = vi.fn();
const signUpPasswordMock = vi.fn();
const sendEmailCodeMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@clerk/react", () => ({
  useSignIn: () => ({
    signIn: {
      password: passwordMock,
      sso: ssoMock,
      create: signInCreateMock,
      resetPasswordEmailCode: { sendCode: sendResetCodeMock },
      status: "complete",
      finalize: vi.fn(),
    },
  }),
  useSignUp: () => ({
    signUp: {
      password: signUpPasswordMock,
      verifications: { sendEmailCode: sendEmailCodeMock, verifyEmailCode: vi.fn() },
      status: "missing_requirements",
      finalize: vi.fn(),
    },
  }),
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
    passwordMock.mockResolvedValue({ error: null });
    await renderAuth();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(passwordMock).toHaveBeenCalledWith({
      emailAddress: "test@example.com",
      password: "password123",
    }));
  });

  it("shows error for invalid login credentials", async () => {
    passwordMock.mockRejectedValue(new Error("Invalid credentials"));
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
    signUpPasswordMock.mockResolvedValue({ error: null });
    sendEmailCodeMock.mockResolvedValue({ error: null });
    await renderAuth();
    fireEvent.click(screen.getByText("Sign up"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "GoodPass1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "GoodPass1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(signUpPasswordMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeDefined());
  });

  it("handles already registered error on signup", async () => {
    signUpPasswordMock.mockRejectedValue(new Error("Email already taken"));
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
    signInCreateMock.mockResolvedValue({ error: null });
    sendResetCodeMock.mockResolvedValue({ error: null });
    await renderAuth();
    fireEvent.click(screen.getByText("Forgot password?"));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "forgot@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => expect(signInCreateMock).toHaveBeenCalledWith({ identifier: "forgot@example.com" }));
    await waitFor(() => expect(sendResetCodeMock).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith(
      "Check your email for a reset code"
    ));
  });

  it("handles Google OAuth", async () => {
    ssoMock.mockResolvedValue({ error: null });
    await renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(ssoMock).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "oauth_google" })
    ));
  });

  it("handles Google OAuth error", async () => {
    ssoMock.mockRejectedValue(new Error("OAuth failed"));
    await renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("OAuth failed"));
  });
});

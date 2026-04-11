import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const mockSignUp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: mockSignUp,
      signInWithOAuth: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      verifyOtp: mockVerifyOtp,
      resend: mockResend,
    },
  },
}));

describe("Auth OTP verification", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("transitions to verify mode after successful signup", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    // Switch to signup mode
    fireEvent.click(screen.getByText("Sign up"));

    // Fill in credentials
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });

    // Submit signup
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    expect(screen.getByText(/we sent a 6-digit code/i)).toBeDefined();
  });

  it("renders 6 digit input boxes in verify mode", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    const digitInputs = screen.getAllByRole("textbox");
    expect(digitInputs.length).toBe(6);
  });

  it("auto-advances focus between digit inputs", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    const digitInputs = screen.getAllByRole("textbox") as HTMLInputElement[];

    // Type a digit into the first input — focus should advance to the second input
    digitInputs[0].focus();
    fireEvent.change(digitInputs[0], { target: { value: "1" } });

    // The first input should now hold "1"
    expect(digitInputs[0].value).toBe("1");
    // Focus must have moved to the next input
    expect(document.activeElement).toBe(digitInputs[1]);
  });

  it("moves focus to previous input on Backspace when current input is empty", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    const digitInputs = screen.getAllByRole("textbox") as HTMLInputElement[];

    // Put focus on the second input (which is empty) and press Backspace
    digitInputs[1].focus();
    fireEvent.keyDown(digitInputs[1], { key: "Backspace" });

    // Focus should have moved back to the first input
    expect(document.activeElement).toBe(digitInputs[0]);
  });

  it("calls verify-otp proxy when all 6 digits are entered", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "at", refresh_token: "rt" }), { status: 200 })
    );

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    const digitInputs = screen.getAllByRole("textbox") as HTMLInputElement[];

    for (let i = 0; i < 6; i++) {
      fireEvent.change(digitInputs[i], { target: { value: String(i + 1) } });
    }

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith("/api/verify-otp", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", token: "123456" }),
      }));
    });

    fetchSpy.mockRestore();
  });

  it("shows resend link with cooldown timer", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    // Should show resend button with countdown
    expect(screen.getByText(/resend code/i)).toBeDefined();
    // Cooldown starts at 60s
    expect(screen.getByText(/60s/i)).toBeDefined();

    // Advance time by 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByText(/50s/i)).toBeDefined();
    });
  });

  it('"Use a different email" resets to signup form', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    const { default: AuthPage } = await import("@/pages/Auth");
    const { fireEvent } = await import("@testing-library/react");

    render(
      <HelmetProvider>
        <MemoryRouter>
          <AuthPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.click(screen.getByText("Sign up"));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Password1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    fireEvent.click(screen.getByText(/use a different email/i));

    await waitFor(() => {
      expect(screen.getByText("Create your account")).toBeDefined();
    });

    expect(screen.getByRole("button", { name: /create account/i })).toBeDefined();
  });
});

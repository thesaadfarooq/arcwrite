import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const mockSignUpPassword = vi.fn();
const mockSendEmailCode = vi.fn();
const mockVerifyEmailCode = vi.fn();
const mockFinalize = vi.fn();
const mockNavigate = vi.fn();

let signUpStatus = "missing_requirements";

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

vi.mock("@clerk/react", () => ({
  useSignIn: () => ({
    signIn: {
      password: vi.fn().mockResolvedValue({ error: null }),
      sso: vi.fn().mockResolvedValue({ error: null }),
      create: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordEmailCode: { sendCode: vi.fn().mockResolvedValue({ error: null }) },
      status: "needs_first_factor",
      finalize: vi.fn(),
    },
  }),
  useSignUp: () => ({
    signUp: {
      password: mockSignUpPassword,
      verifications: {
        sendEmailCode: mockSendEmailCode,
        verifyEmailCode: mockVerifyEmailCode,
      },
      get status() { return signUpStatus; },
      finalize: mockFinalize,
    },
  }),
}));

describe("Auth OTP verification", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    signUpStatus = "missing_requirements";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("transitions to verify mode after successful signup", async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });
  });

  it("renders 6 digit input boxes in verify mode", async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    const digitInputs = screen.getAllByRole("textbox");
    expect(digitInputs.length).toBe(6);
  });

  it("auto-advances focus between digit inputs", async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    await act(async () => { vi.advanceTimersByTime(16000); });

    const digitInputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    digitInputs[0].focus();
    fireEvent.change(digitInputs[0], { target: { value: "1" } });

    expect(digitInputs[0].value).toBe("1");
    expect(document.activeElement).toBe(digitInputs[1]);
  });

  it("moves focus to previous input on Backspace when current input is empty", async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    await act(async () => { vi.advanceTimersByTime(16000); });

    const digitInputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    digitInputs[1].focus();
    fireEvent.keyDown(digitInputs[1], { key: "Backspace" });

    expect(document.activeElement).toBe(digitInputs[0]);
  });

  it("calls verifyEmailCode when all 6 digits are entered", async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });
    mockVerifyEmailCode.mockResolvedValueOnce({ error: null });
    signUpStatus = "complete";

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    await act(async () => { vi.advanceTimersByTime(16000); });

    const digitInputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    for (let i = 0; i < 6; i++) {
      fireEvent.change(digitInputs[i], { target: { value: String(i + 1) } });
    }

    await waitFor(() => {
      expect(mockVerifyEmailCode).toHaveBeenCalledWith({ code: "123456" });
    });
  });

  it("shows resend link with cooldown timer", async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeDefined();
    });

    expect(screen.getByText(/resend code/i)).toBeDefined();
    expect(screen.getByText(/60s/i)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(screen.getByText(/50s/i)).toBeDefined();
    });
  });

  it('"Use a different email" resets to signup form', async () => {
    mockSignUpPassword.mockResolvedValueOnce({ error: null });
    mockSendEmailCode.mockResolvedValueOnce({ error: null });

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
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Password1" } });
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

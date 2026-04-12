import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

const updatePasswordMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false, tier: "free" }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@clerk/react", () => ({
  useUser: () => ({ user: { updatePassword: updatePasswordMock } }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe("ResetPassword form handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles successful password reset", async () => {
    updatePasswordMock.mockResolvedValue({});
    const { default: ResetPassword } = await import("@/pages/ResetPassword");
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ResetPassword />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(updatePasswordMock).toHaveBeenCalledWith({ newPassword: "newpassword123" }));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Password updated successfully"));
  });

  it("handles password reset error", async () => {
    updatePasswordMock.mockRejectedValue(new Error("Token expired"));
    const { default: ResetPassword } = await import("@/pages/ResetPassword");
    render(
      <HelmetProvider>
        <MemoryRouter>
          <ResetPassword />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith("Token expired"));
  });
});

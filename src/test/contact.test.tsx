import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("Contact page", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders heading, email link, and form fields", async () => {
    const { default: Contact } = await import("@/pages/Contact");
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Contact />
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /support@arcwrite\.app/i })).toHaveAttribute(
      "href",
      "mailto:support@arcwrite.app"
    );
    expect(screen.getByLabelText(/name/i)).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/message/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDefined();
  });

  it("submits form data to /api/contact", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const { default: Contact } = await import("@/pages/Contact");
    render(
      <HelmetProvider>
        <MemoryRouter>
          <Contact />
        </MemoryRouter>
      </HelmetProvider>
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Jane" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@test.com" } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Hello!" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/contact", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com", message: "Hello!" }),
      }));
    });
  });
});

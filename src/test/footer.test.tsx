import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/Footer";

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  it("renders About link with correct href", () => {
    renderFooter();
    const about = screen.getByRole("link", { name: /^about$/i });
    expect(about).toBeInTheDocument();
    expect(about).toHaveAttribute("href", "/about");
  });

  it("renders Contact link with correct href", () => {
    renderFooter();
    const contact = screen.getByRole("link", { name: /^contact$/i });
    expect(contact).toBeInTheDocument();
    expect(contact).toHaveAttribute("href", "/contact");
  });

  it("displays Silvergrain in copyright", () => {
    renderFooter();
    expect(screen.getByText(/silvergrain/i)).toBeInTheDocument();
  });
});

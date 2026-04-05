import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavLink } from "@/components/NavLink";

describe("NavLink", () => {
  it("renders a link with the correct href", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLink to="/about">About</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByText("About");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/about");
  });

  it("applies activeClassName when the route is active", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <NavLink to="/about" className="base" activeClassName="active-class">
          About
        </NavLink>
      </MemoryRouter>
    );
    const link = screen.getByText("About");
    expect(link.className).toContain("active-class");
  });

  it("does not apply activeClassName when route is inactive", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavLink to="/about" className="base" activeClassName="active-class">
          About
        </NavLink>
      </MemoryRouter>
    );
    const link = screen.getByText("About");
    expect(link.className).not.toContain("active-class");
  });
});

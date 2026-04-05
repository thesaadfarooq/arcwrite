import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/lib/theme";

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  it("provides default theme", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    // Default depends on matchMedia mock (returns false for dark) so should be "light"
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("toggles theme from light to dark", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("toggles theme back from dark to light", () => {
    // localStorage may have 'dark' from previous test, so clear it
    localStorage.removeItem("arcwrite-theme");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText("Toggle")); // light -> dark
    fireEvent.click(screen.getByText("Toggle")); // dark -> light
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("saves theme to localStorage", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText("Toggle"));
    expect(setItemSpy).toHaveBeenCalledWith("arcwrite-theme", "dark");
    setItemSpy.mockRestore();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExploreModeBar } from "@/components/story/ExploreModeBar";

describe("ExploreModeBar", () => {
  it("renders the branch name", () => {
    render(
      <ExploreModeBar branchName="Test Branch" onSetAsMain={vi.fn()} onReturnToMain={vi.fn()} />
    );
    expect(screen.getByText("Test Branch")).toBeDefined();
  });

  it("renders 'Unnamed branch' when name is null", () => {
    render(
      <ExploreModeBar branchName={null} onSetAsMain={vi.fn()} onReturnToMain={vi.fn()} />
    );
    expect(screen.getByText("Unnamed branch")).toBeDefined();
  });

  it("calls onSetAsMain when clicked", () => {
    const onSetAsMain = vi.fn();
    render(
      <ExploreModeBar branchName="B1" onSetAsMain={onSetAsMain} onReturnToMain={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Set as main"));
    expect(onSetAsMain).toHaveBeenCalledOnce();
  });

  it("calls onReturnToMain when clicked", () => {
    const onReturnToMain = vi.fn();
    render(
      <ExploreModeBar branchName="B1" onSetAsMain={vi.fn()} onReturnToMain={onReturnToMain} />
    );
    fireEvent.click(screen.getByText("Return to main"));
    expect(onReturnToMain).toHaveBeenCalledOnce();
  });
});

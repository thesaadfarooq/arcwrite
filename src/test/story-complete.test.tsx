import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StoryComplete } from "@/components/story/StoryComplete";

describe("StoryComplete", () => {
  it("renders the completion actions and calls the provided callbacks", () => {
    const onShare = vi.fn();
    const onExport = vi.fn();
    const onDashboard = vi.fn();
    const onContinue = vi.fn();

    render(
      <StoryComplete
        onShare={onShare}
        onExport={onExport}
        onDashboard={onDashboard}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText(/story complete/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /share story/i }));
    fireEvent.click(screen.getByRole("button", { name: /export as pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue anyway/i }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onDashboard).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
